import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen } from "@/core/einsatz/repository";
import { ausloeserFinden } from "@/tools/einsatztagebuch/components/datei-auswahl";
import { ebene } from "@/tools/dateien/components/dateibrowser";
import type { DateiHandle, OrdnerHandle } from "./ordner";
import { ordnerVerknuepfen } from "./repository";
import { dateienFiltern, dateiLesen, DateiFehler, verweiseZerlegen, verweisText } from "./verweis";

describe("Dateiverweise", () => {
  it("zerlegt Text mit Verweisen und lässt Unpassendes stehen", () => {
    expect(verweiseZerlegen(`Drohnenbild ${verweisText("Drohne", "Flug 1/DJI_0001.JPG")} zeigt Leck, [[ohne-ordner]] bleibt`)).toEqual([
      { art: "text", text: "Drohnenbild " },
      { art: "verweis", ordner: "Drohne", pfad: "Flug 1/DJI_0001.JPG", text: "[[Drohne/Flug 1/DJI_0001.JPG]]" },
      { art: "text", text: " zeigt Leck, [[ohne-ordner]] bleibt" },
    ]);
    expect(verweiseZerlegen("nur Text")).toEqual([{ art: "text", text: "nur Text" }]);
  });

  it("filtert Dateien über alle Ordner, neueste zuerst", () => {
    const ordner = [
      { name: "Drohne", dateien: [{ pfad: "DJI_0001.JPG", groesse: 1, geaendert: 1 }, { pfad: "DJI_0002.MP4", groesse: 1, geaendert: 3 }] },
      { name: "Fotos", dateien: [{ pfad: "Tank 3.jpg", groesse: 1, geaendert: 2 }] },
    ];
    expect(dateienFiltern(ordner, "").map((d) => d.pfad)).toEqual(["DJI_0002.MP4", "Tank 3.jpg", "DJI_0001.JPG"]);
    expect(dateienFiltern(ordner, "drohne jpg").map((d) => d.pfad)).toEqual(["DJI_0001.JPG"]);
    expect(dateienFiltern(ordner, "fotos").map((d) => d.ordner)).toEqual(["Fotos"]);
  });

  it("erkennt den „/“-Befehl nur am Wortanfang", () => {
    expect(ausloeserFinden("/", 1)).toEqual({ start: 0, ende: 1, suche: "" });
    expect(ausloeserFinden("Bild /dji", 9)).toEqual({ start: 5, ende: 9, suche: "dji" });
    expect(ausloeserFinden("1/2 Zug", 2)).toBeNull();
    expect(ausloeserFinden("ohne", 4)).toBeNull();
    expect(ausloeserFinden("[[Drohne/a.jpg]] ", 17)).toBeNull();
  });

  it("baut eine Ordnerebene aus der flachen Liste", () => {
    const d = (pfad: string) => ({ pfad, groesse: 1, geaendert: 1 });
    const e = ebene([d("a.jpg"), d("Flug1/b.jpg"), d("Flug1/c.jpg"), d("Flug1/x/y.jpg")], "");
    expect(e.ordner.map((o) => [o.name, o.anzahl])).toEqual([["Flug1", 3]]);
    expect(e.dateien.map((x) => x.pfad)).toEqual(["a.jpg"]);
    expect(ebene([d("Flug1/b.jpg"), d("Flug1/x/y.jpg")], "Flug1").ordner.map((o) => o.name)).toEqual(["x"]);
  });
});

describe("dateiLesen", () => {
  const offen: LagekitDB[] = [];
  afterEach(async () => {
    await Promise.all(offen.splice(0).map((db) => db.delete()));
  });

  it("findet Dateien in Unterordnern und meldet fehlende verständlich", async () => {
    const db = new LagekitDB(`test-${crypto.randomUUID()}`);
    offen.push(db);
    const einsatz = await einsatzAnlegen(db, { stichwort: "Übung" });
    const datei: DateiHandle = { kind: "file", name: "b.jpg", getFile: async () => new File(["x"], "b.jpg") };
    const flug: OrdnerHandle = { kind: "directory", name: "Flug1", async *values() { yield datei; } };
    const wurzel: OrdnerHandle = { kind: "directory", name: "Drohne", async *values() { yield flug; } };
    const { id } = await ordnerVerknuepfen(db, einsatz.id, { kind: "directory", name: "Drohne" } as OrdnerHandle);
    // Handles lassen sich in fake-indexeddb nicht ablegen: hier über einen Hook wieder einsetzen.
    db.ordner.hook("reading", (o) => (o.id === id ? { ...o, handle: wurzel } : o));

    expect((await dateiLesen(db, einsatz.id, "Drohne", "Flug1/b.jpg")).name).toBe("b.jpg");
    await expect(dateiLesen(db, einsatz.id, "Drohne", "Flug1/fehlt.jpg")).rejects.toThrow(/gibt es im Ordner/);
    await expect(dateiLesen(db, einsatz.id, "Fotos", "a.jpg")).rejects.toThrow(DateiFehler);
  });
});
