import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen, einsatzLoeschen } from "@/core/einsatz/repository";
import { exportErstellen, importieren } from "@/core/export/json";
import { gesamtdosis } from "./logic";
import {
  aufenthaltBeenden,
  aufenthaltNachtragen,
  aufenthaltStarten,
  aufenthalte,
  dosimeterSetzen,
  odlWechseln,
  personAnlegen,
  personen,
  richtwerteLesen,
  richtwerteSpeichern,
  truppNachtragen,
} from "./repository";
import { STANDARD_RICHTWERTE } from "./richtwerte";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

const t = (hhmm: string) => new Date(`2026-11-14T${hhmm}:00.000Z`);

async function trupp(db: LagekitDB) {
  const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2" });
  const a = await personAnlegen(db, { einsatzId: einsatz.id, name: "Meier", trupp: "AT 1" });
  const b = await personAnlegen(db, { einsatzId: einsatz.id, name: "Schulz", trupp: "AT 1" });
  return { einsatz, a, b };
}

describe("Aufenthalte", () => {
  it("startet und beendet einen Trupp gemeinsam und rechnet die Dosis", async () => {
    const db = testDb();
    const { a, b } = await trupp(db);

    await aufenthaltStarten(db, [a.id, b.id], { ort: "Halle 3", odl: 600, odlEinheit: "µSv/h" }, t("10:00"));
    // Zweiter Start überspringt Personen mit laufendem Aufenthalt.
    expect(await aufenthaltStarten(db, [a.id], { ort: "X", odl: 1, odlEinheit: "mSv/h" }, t("10:05"))).toHaveLength(0);
    expect(await aufenthaltBeenden(db, [a.id, b.id], t("10:30"))).toBe(2);

    const liste = await aufenthalte(db).where("personId").equals(a.id).toArray();
    expect(liste).toHaveLength(1);
    expect(gesamtdosis(liste, t("12:00"))).toBeCloseTo(0.3, 12);
  });

  it("trägt Aufenthalte nach und speichert Dosimeterwerte", async () => {
    const db = testDb();
    const { a } = await trupp(db);
    const nachgetragen = await aufenthaltNachtragen(db, a.id, {
      ort: "Messpunkt 2",
      odl: 2,
      odlEinheit: "mSv/h",
      beginn: t("08:00").toISOString(),
      ende: t("08:15").toISOString(),
    });
    await dosimeterSetzen(db, nachgetragen.id, 0.48);
    expect((await aufenthalte(db).get(nachgetragen.id))?.dosimeterMsv).toBe(0.48);
  });

  it("trägt einen Aufenthalt für den ganzen Trupp nach", async () => {
    const db = testDb();
    const { a, b } = await trupp(db);
    const neu = await truppNachtragen(db, [a.id, b.id], {
      ort: "Messpunkt 1",
      odl: 0.01,
      odlEinheit: "Sv/h",
      beginn: t("08:00").toISOString(),
      ende: t("08:30").toISOString(),
    });
    expect(neu).toHaveLength(2);
    for (const person of [a, b]) {
      const liste = await aufenthalte(db).where("personId").equals(person.id).toArray();
      expect(gesamtdosis(liste, t("12:00"))).toBeCloseTo(5, 12);
      expect(liste[0].dosimeterMsv).toBeNull();
    }
  });

  it("wechselt die ODL eines laufenden Trupps ohne Lücke", async () => {
    const db = testDb();
    const { a, b } = await trupp(db);
    await aufenthaltStarten(db, [a.id], { ort: "Halle 3", odl: 1, odlEinheit: "mSv/h" }, t("10:00"));
    // b läuft nicht und bleibt unberührt.
    const neu = await odlWechseln(db, [a.id, b.id], { ort: "Halle 4", odl: 2, odlEinheit: "mSv/h" }, t("10:30"));
    expect(neu.map((x) => x.personId)).toEqual([a.id]);
    await aufenthaltBeenden(db, [a.id], t("11:00"));
    const liste = await aufenthalte(db).where("personId").equals(a.id).sortBy("beginn");
    expect(liste.map((x) => [x.ort, x.beginn, x.ende])).toEqual([
      ["Halle 3", t("10:00").toISOString(), t("10:30").toISOString()],
      ["Halle 4", t("10:30").toISOString(), t("11:00").toISOString()],
    ]);
    expect(gesamtdosis(liste, t("12:00"))).toBeCloseTo(1.5, 12);
    expect(await aufenthalte(db).where("personId").equals(b.id).count()).toBe(0);
  });

  it("lehnt Ende vor Beginn und negative ODL ab", async () => {
    const db = testDb();
    const { a } = await trupp(db);
    await expect(
      aufenthaltNachtragen(db, a.id, {
        ort: "X",
        odl: 1,
        odlEinheit: "mSv/h",
        beginn: t("09:00").toISOString(),
        ende: t("08:00").toISOString(),
      }),
    ).rejects.toThrow(/Ende liegt vor dem Beginn/);
    await expect(
      aufenthaltStarten(db, [a.id], { ort: "X", odl: -1, odlEinheit: "mSv/h" }),
    ).rejects.toThrow(/negativ/);
  });
});

describe("Richtwerte", () => {
  it("nutzt Standardwerte und speichert eigene", async () => {
    const db = testDb();
    expect(await richtwerteLesen(db)).toEqual(STANDARD_RICHTWERTE);
    const eigene = [{ id: "uebung", bezeichnung: "Übung", grenzeMsv: 1, hinweis: "" }];
    await richtwerteSpeichern(db, eigene);
    expect(await richtwerteLesen(db)).toEqual(eigene);
    await richtwerteSpeichern(db, null);
    expect(await richtwerteLesen(db)).toEqual(STANDARD_RICHTWERTE);
  });
});

describe("Zusammenspiel mit Einsatz, Export und Import", () => {
  it("überträgt Personen und Aufenthalte mit der Sicherung", async () => {
    const quelle = testDb();
    const { a, b } = await trupp(quelle);
    await aufenthaltStarten(quelle, [a.id, b.id], { ort: "Halle", odl: 1, odlEinheit: "mSv/h" }, t("10:00"));

    const datei = JSON.parse(JSON.stringify(await exportErstellen(quelle)));
    expect(datei.tabellen.dosisPersonen).toHaveLength(2);
    expect(datei.tabellen.dosisAufenthalte).toHaveLength(2);

    const ziel = testDb();
    expect(await importieren(ziel, datei)).toMatchObject({ einsaetzeNeu: 1, zeilenNeu: 4 });
    expect(await importieren(ziel, datei)).toMatchObject({ zeilenNeu: 0, zeilenVorhanden: 4 });
    expect(await personen(ziel).count()).toBe(2);
  });

  it("weist kaputte Tool-Einträge beim Import vollständig ab", async () => {
    const quelle = testDb();
    const { a } = await trupp(quelle);
    await aufenthaltStarten(quelle, [a.id], { ort: "Halle", odl: 1, odlEinheit: "mSv/h" });
    const datei = JSON.parse(JSON.stringify(await exportErstellen(quelle)));
    datei.tabellen.dosisAufenthalte[0].odl = "viel";

    const ziel = testDb();
    await expect(importieren(ziel, datei)).rejects.toThrow(/Ungültiger Eintrag 1/);
    expect(await ziel.einsaetze.count()).toBe(0);
  });

  it("löscht beim Löschen des Einsatzes auch alle Dosisdaten", async () => {
    const db = testDb();
    const { einsatz, a } = await trupp(db);
    await aufenthaltStarten(db, [a.id], { ort: "Halle", odl: 1, odlEinheit: "mSv/h" });
    await einsatzLoeschen(db, einsatz.id);
    expect(await personen(db).count()).toBe(0);
    expect(await aufenthalte(db).count()).toBe(0);
  });
});
