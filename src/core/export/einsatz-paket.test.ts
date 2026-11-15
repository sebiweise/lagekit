import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen } from "@/core/einsatz/repository";
import { eintragHinzufuegen } from "@/tools/einsatztagebuch/repository";
import { sucheSpeichern } from "@/tools/recherche/repository";
import { aufenthaltStarten, personAnlegen } from "@/tools/strahlenexposition/repository";
import { berichtHtml, esc } from "./bericht";
import { einsatzDatenLaden, einsatzSicherung, kurzbericht, paketDateiname, paketInhalt } from "./einsatz-paket";
import { exportDateiLesen } from "./json";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

async function beispiel() {
  const db = testDb();
  const beginn = new Date("2026-11-15T08:00:00Z");
  const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2 <Werk>", ort: "Werk Nord", einheit: "ELW 1" }, beginn);
  await eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Lage", inhalt: "Austritt an Tank 3 & Halle", zeitpunkt: beginn }, beginn);
  const person = await personAnlegen(db, { einsatzId: einsatz.id, name: "Müller", trupp: "AT 1" });
  await aufenthaltStarten(db, [person.id], { ort: "Tank 3", odl: 100, odlEinheit: "µSv/h" }, beginn);
  await sucheSpeichern(
    db,
    { einsatzId: einsatz.id, toolId: "osm", toolName: "OpenStreetMap", begriff: "Werk Nord", url: "https://www.openstreetmap.org/", art: "direkt" },
    beginn,
  );
  return { db, einsatz };
}

describe("Einsatz-Paket", () => {
  it("bündelt Bericht, Sicherung, CSVs und Ordnerdateien", async () => {
    const { db, einsatz } = await beispiel();
    const jetzt = new Date("2026-11-15T09:00:00Z");
    const daten = (await einsatzDatenLaden(db, einsatz.id))!;
    const sicherung = await einsatzSicherung(db, einsatz.id, jetzt);
    const inhalt = paketInhalt(
      daten,
      sicherung,
      [{ ordner: "Drohne", pfad: "Flug1/DJI_0001.JPG", datei: new Blob(["x"]), groesse: 1, geaendert: jetzt.getTime() }],
      jetzt,
    );
    expect(inhalt.map((e) => e.pfad)).toEqual([
      "LIESMICH.txt",
      "einsatzbericht.html",
      "sicherung.json",
      "einsatztagebuch.csv",
      "strahlenexposition.csv",
      "suchverlauf.csv",
      "dateien/Drohne/Flug1/DJI_0001.JPG",
    ]);
    // Die Sicherung im ZIP lässt sich wieder importieren.
    const json = inhalt.find((e) => e.pfad === "sicherung.json")!.inhalt as string;
    expect(exportDateiLesen(json).einsaetze).toHaveLength(1);
    expect(paketDateiname(einsatz, jetzt)).toBe("lagekit-2026-11-15-abc-2-werk.zip");
  });

  it("maskiert Eingaben im Bericht", async () => {
    const { db, einsatz } = await beispiel();
    const html = berichtHtml((await einsatzDatenLaden(db, einsatz.id))!, { jetzt: new Date("2026-11-15T09:00:00Z") });
    expect(html).toContain("Einsatzbericht: ABC 2 &lt;Werk&gt;");
    expect(html).toContain("Austritt an Tank 3 &amp; Halle");
    expect(html).not.toContain("<Werk>");
    expect(html).toContain("0,100 mSv"); // 100 µSv/h × 1 h
    expect(html).not.toMatch(/<script/i);
    expect(esc(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });

  it("fasst den Einsatz kurz als Mailtext zusammen", async () => {
    const { db, einsatz } = await beispiel();
    const text = kurzbericht((await einsatzDatenLaden(db, einsatz.id))!, new Date("2026-11-15T09:00:00Z"));
    expect(text).toContain("Einsatz: ABC 2 <Werk>");
    expect(text).toContain("Ort: Werk Nord");
    expect(text).toContain("- Müller (AT 1): 0,100 mSv");
    expect(text).toMatch(/1\. \d\d:\d\d Lage: Austritt an Tank 3 & Halle/);
  });
});
