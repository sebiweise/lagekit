import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAbschliessen, einsatzAnlegen } from "@/core/einsatz/repository";
import {
  dateinamenTeil,
  exportDateiLesen,
  exportDateiname,
  exportErstellen,
  ImportFehler,
  importieren,
} from "./json";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("JSON-Export und -Import", () => {
  it("überträgt alle Einsätze auf ein anderes Gerät", async () => {
    const quelle = testDb();
    await einsatzAnlegen(quelle, { stichwort: "ABC 2", ort: "Werk Nord" });
    await einsatzAnlegen(quelle, { stichwort: "Übung" });

    const text = JSON.stringify(await exportErstellen(quelle));
    const ziel = testDb();
    const ergebnis = await importieren(ziel, exportDateiLesen(text));

    expect(ergebnis).toMatchObject({ einsaetzeNeu: 2, einsaetzeAktualisiert: 0 });
    expect(await ziel.einsaetze.toArray()).toEqual(await quelle.einsaetze.toArray());
  });

  it("exportiert auf Wunsch nur einen Einsatz", async () => {
    const db = testDb();
    const a = await einsatzAnlegen(db, { stichwort: "A" });
    await einsatzAnlegen(db, { stichwort: "B" });
    const datei = await exportErstellen(db, { einsatzIds: [a.id] });
    expect(datei.einsaetze.map((e) => e.stichwort)).toEqual(["A"]);
  });

  it("übernimmt bei doppelten Einsätzen die neuere Fassung", async () => {
    const geraet = testDb();
    const einsatz = await einsatzAnlegen(geraet, { stichwort: "Brand" }, new Date("2026-11-14T08:00:00Z"));
    const alteSicherung = await exportErstellen(geraet);
    await einsatzAbschliessen(geraet, einsatz.id, new Date("2026-11-14T12:00:00Z"));
    const neueSicherung = await exportErstellen(geraet);

    // Ältere Sicherung überschreibt den neueren Stand nicht.
    expect(await importieren(geraet, alteSicherung)).toMatchObject({ einsaetzeUnveraendert: 1 });
    expect((await geraet.einsaetze.get(einsatz.id))?.status).toBe("abgeschlossen");

    // Auf einem Gerät mit dem alten Stand gewinnt die neuere Sicherung.
    const anderes = testDb();
    await importieren(anderes, alteSicherung);
    expect(await importieren(anderes, neueSicherung)).toMatchObject({ einsaetzeAktualisiert: 1 });
    expect((await anderes.einsaetze.get(einsatz.id))?.status).toBe("abgeschlossen");
  });

  it("lehnt kaputte und fremde Dateien ab", () => {
    expect(() => exportDateiLesen("{kein json")).toThrow(ImportFehler);
    expect(() => exportDateiLesen(JSON.stringify({ format: "anderes" }))).toThrow(
      /keine Lagekit-Sicherung/,
    );
  });

  it("meldet unbekannte Tool-Tabellen, statt sie still zu verwerfen", async () => {
    const db = testDb();
    const datei = await exportErstellen(db);
    datei.tabellen["zukunftsTool"] = [];
    expect((await importieren(db, datei)).unbekannteTabellen).toEqual(["zukunftsTool"]);
  });
});

describe("Dateinamen", () => {
  it("bildet lesbare, sichere Namen", () => {
    expect(dateinamenTeil("Übung Größe/ABC 2")).toBe("uebung-groesse-abc-2");
    const jetzt = new Date("2026-11-14T10:00:00Z");
    expect(exportDateiname([], jetzt)).toBe("lagekit-2026-11-14-leer.json");
  });
});
