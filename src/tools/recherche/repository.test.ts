import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen, einsatzLoeschen } from "@/core/einsatz/repository";
import { exportErstellen, importieren } from "@/core/export/json";
import { suchen, sucheSpeichern } from "./repository";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("Suchverlauf", () => {
  it("speichert Suchen je Einsatz und löscht sie mit dem Einsatz", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2" });
    const suche = await sucheSpeichern(
      db,
      {
        einsatzId: einsatz.id,
        toolId: "gestis",
        toolName: "GESTIS-Stoffdatenbank",
        begriff: " Chlor ",
        url: "https://gestis.dguv.de/",
        art: "kopiert",
      },
      new Date("2026-11-14T20:00:00Z"),
    );
    expect(suche).toMatchObject({ begriff: "Chlor", ort: "", zeitpunkt: "2026-11-14T20:00:00.000Z" });
    expect(await suchen(db).where("einsatzId").equals(einsatz.id).count()).toBe(1);

    await einsatzLoeschen(db, einsatz.id);
    expect(await suchen(db).count()).toBe(0);
  });

  it("lehnt leere Begriffe ab", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "X" });
    await expect(
      sucheSpeichern(db, { einsatzId: einsatz.id, toolId: "a", toolName: "A", begriff: "  ", url: "https://a.de/", art: "direkt" }),
    ).rejects.toThrow();
  });

  it("wandert mit Export und Import auf ein anderes Gerät", async () => {
    const quelle = testDb();
    const einsatz = await einsatzAnlegen(quelle, { stichwort: "VU" });
    await sucheSpeichern(quelle, {
      einsatzId: einsatz.id,
      toolId: "dasoertliche",
      toolName: "Das Örtliche",
      begriff: "Abschleppdienst",
      ort: "Kassel",
      url: "https://www.dasoertliche.de/?kw=Abschleppdienst&ci=Kassel&form_name=search_nat",
      art: "direkt",
    });
    const ziel = testDb();
    await importieren(ziel, await exportErstellen(quelle));
    expect((await suchen(ziel).toArray())[0]).toMatchObject({ begriff: "Abschleppdienst", ort: "Kassel" });
  });
});
