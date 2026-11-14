import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsaetzeAuflisten, einsatzAnlegen } from "./repository";

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
