import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import {
  aktivenEinsatzSetzen,
  aktiverEinsatz,
  einsaetzeAuflisten,
  einsatzAbschliessen,
  einsatzAnlegen,
  einsatzLoeschen,
  einsatzWiederOeffnen,
} from "./repository";

let db: LagekitDB;

function neueDb() {
  db = new LagekitDB(`test-${crypto.randomUUID()}`);
  return db;
}

afterEach(async () => {
  await db?.delete();
});

describe("einsatzAnlegen", () => {
  it("legt einen aktiven Einsatz mit gesetzten Zeitstempeln an", async () => {
    const jetzt = new Date("2026-11-14T10:00:00.000Z");
    const einsatz = await einsatzAnlegen(
      neueDb(),
      { stichwort: "  ABC 2  ", ort: "Musterstadt", einheit: "ELW 1" },
      jetzt,
    );

    expect(einsatz).toMatchObject({
      stichwort: "ABC 2",
      ort: "Musterstadt",
      einheit: "ELW 1",
      status: "aktiv",
      beginn: jetzt.toISOString(),
      ende: null,
      erstelltAm: jetzt.toISOString(),
    });
    expect(await db.einsaetze.get(einsatz.id)).toEqual(einsatz);
  });

  it("macht den neuen Einsatz zum aktiven Einsatz", async () => {
    neueDb();
    await einsatzAnlegen(db, { stichwort: "Erster" });
    const zweiter = await einsatzAnlegen(db, { stichwort: "Zweiter" });
    expect((await aktiverEinsatz(db))?.id).toBe(zweiter.id);
  });

  it("lehnt einen Einsatz ohne Stichwort ab", async () => {
    await expect(einsatzAnlegen(neueDb(), { stichwort: "   " })).rejects.toThrow();
    expect(await db.einsaetze.count()).toBe(0);
  });
});

describe("einsaetzeAuflisten", () => {
  it("liefert den neuesten Einsatz zuerst", async () => {
    neueDb();
    await einsatzAnlegen(db, { stichwort: "Alt", beginn: "2026-11-01T08:00:00.000Z" });
    await einsatzAnlegen(db, { stichwort: "Neu", beginn: "2026-11-14T08:00:00.000Z" });

    const liste = await einsaetzeAuflisten(db);
    expect(liste.map((e) => e.stichwort)).toEqual(["Neu", "Alt"]);
  });
});

describe("Abschließen und Wiederöffnen", () => {
  it("setzt Ende und Status und hebt beides wieder auf", async () => {
    neueDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "Brand" }, new Date("2026-11-14T08:00:00Z"));
    const ende = new Date("2026-11-14T12:30:00Z");

    const abgeschlossen = await einsatzAbschliessen(db, einsatz.id, ende);
    expect(abgeschlossen).toMatchObject({ status: "abgeschlossen", ende: ende.toISOString() });
    expect(abgeschlossen.geaendertAm).toBe(ende.toISOString());

    const offen = await einsatzWiederOeffnen(db, einsatz.id, new Date("2026-11-14T13:00:00Z"));
    expect(offen).toMatchObject({ status: "aktiv", ende: null });
  });

  it("meldet einen unbekannten Einsatz", async () => {
    await expect(einsatzAbschliessen(neueDb(), crypto.randomUUID())).rejects.toThrow(/nicht gefunden/);
  });
});

describe("Aktiver Einsatz und Löschen", () => {
  it("wechselt den aktiven Einsatz", async () => {
    neueDb();
    const erster = await einsatzAnlegen(db, { stichwort: "Erster" });
    await einsatzAnlegen(db, { stichwort: "Zweiter" });
    await aktivenEinsatzSetzen(db, erster.id);
    expect((await aktiverEinsatz(db))?.id).toBe(erster.id);
    await aktivenEinsatzSetzen(db, null);
    expect(await aktiverEinsatz(db)).toBeNull();
  });

  it("löscht einen Einsatz und hebt die Auswahl auf", async () => {
    neueDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "Übung" });
    await einsatzLoeschen(db, einsatz.id);
    expect(await db.einsaetze.count()).toBe(0);
    expect(await aktiverEinsatz(db)).toBeNull();
  });
});
