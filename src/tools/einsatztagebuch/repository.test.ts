import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen } from "@/core/einsatz/repository";
import { exportErstellen, importieren } from "@/core/export/json";
import { korrekturen } from "./logic";
import { eintraege, eintragHinzufuegen, verfasserLesen, verfasserSpeichern } from "./repository";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("Einsatztagebuch", () => {
  it("nummeriert je Einsatz fortlaufend", async () => {
    const db = testDb();
    const a = await einsatzAnlegen(db, { stichwort: "A" });
    const b = await einsatzAnlegen(db, { stichwort: "B" });
    await eintragHinzufuegen(db, { einsatzId: a.id, art: "Meldung", inhalt: "eins" });
    await eintragHinzufuegen(db, { einsatzId: a.id, art: "Befehl", inhalt: "zwei" });
    const erster = await eintragHinzufuegen(db, { einsatzId: b.id, art: "Notiz", inhalt: "B eins" });
    expect(erster.nr).toBe(1);
    const nummern = (await eintraege(db).where("einsatzId").equals(a.id).toArray()).map((e) => e.nr);
    expect(nummern.sort()).toEqual([1, 2]);
  });

  it("trennt Ereigniszeit und Erfassungszeit", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "A" });
    const jetzt = new Date("2026-11-14T10:10:00Z");
    const e = await eintragHinzufuegen(
      db,
      { einsatzId: einsatz.id, art: "Lage", inhalt: "nachgetragen", zeitpunkt: new Date("2026-11-14T09:55:00Z") },
      jetzt,
    );
    expect(e.zeitpunkt).toBe("2026-11-14T09:55:00.000Z");
    expect(e.erfasstAm).toBe(jetzt.toISOString());
  });

  it("korrigiert durch einen neuen Eintrag und lässt den alten unverändert", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "A" });
    const alt = await eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Meldung", inhalt: "3 Verletzte" });
    const neu = await eintragHinzufuegen(db, {
      einsatzId: einsatz.id,
      art: "Meldung",
      inhalt: "2 Verletzte",
      korrigiertEintragId: alt.id,
    });
    expect(await eintraege(db).get(alt.id)).toEqual(alt);
    expect(korrekturen(await eintraege(db).toArray()).get(alt.id)?.id).toBe(neu.id);
    await expect(
      eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Notiz", inhalt: "x", korrigiertEintragId: crypto.randomUUID() }),
    ).rejects.toThrow(/nicht gefunden/);
  });

  it("lehnt leere Einträge ab", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "A" });
    await expect(eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Notiz", inhalt: "   " })).rejects.toThrow();
  });

  it("merkt sich den Verfasser je Gerät", async () => {
    const db = testDb();
    expect(await verfasserLesen(db)).toBe("");
    await verfasserSpeichern(db, " S. Weber ");
    expect(await verfasserLesen(db)).toBe("S. Weber");
  });

  it("überträgt das Tagebuch mit der Sicherung, ohne vorhandene Einträge zu überschreiben", async () => {
    const quelle = testDb();
    const einsatz = await einsatzAnlegen(quelle, { stichwort: "A" });
    await eintragHinzufuegen(quelle, { einsatzId: einsatz.id, art: "Meldung", inhalt: "Original" });
    const datei = JSON.parse(JSON.stringify(await exportErstellen(quelle)));

    const ziel = testDb();
    await importieren(ziel, datei);
    datei.tabellen.tagebuchEintraege[0].inhalt = "Manipuliert";
    expect(await importieren(ziel, datei)).toMatchObject({ zeilenNeu: 0, zeilenVorhanden: 1 });
    expect((await eintraege(ziel).toArray())[0].inhalt).toBe("Original");
  });
});
