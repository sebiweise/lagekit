import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen, einsatzLoeschen } from "@/core/einsatz/repository";
import { exportErstellen } from "@/core/export/json";
import { groesseText, ordnerDurchsuchen, vergleichen, type DateiHandle, type OrdnerHandle } from "./ordner";
import { neueGesehen, ordnerAbgleichen, ordnerDesEinsatzes, ordnerVerknuepfen } from "./repository";

type Baum = { [name: string]: Baum | string };

/** Nachbau eines Ordner-Handles aus einem Objektbaum. */
function ordner(name: string, baum: Baum): OrdnerHandle {
  return {
    kind: "directory",
    name,
    async *values() {
      for (const [n, inhalt] of Object.entries(baum)) {
        if (typeof inhalt === "string") {
          const datei: DateiHandle = {
            kind: "file",
            name: n,
            getFile: async () => new File([inhalt], n, { lastModified: 1_700_000_000_000 }),
          };
          yield datei;
        } else {
          yield ordner(n, inhalt);
        }
      }
    },
  };
}

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("Ordner durchsuchen", () => {
  it("liest Unterordner, überspringt Systemdateien und sortiert nach Pfad", async () => {
    const handle = ordner("Drohne", {
      "DJI_0002.JPG": "bb",
      ".DS_Store": "x",
      "Thumbs.db": "x",
      Flug1: { "DJI_0001.MP4": "aaaa", Tief: { "x.txt": "1" } },
    });
    const ergebnis = await ordnerDurchsuchen(handle, { maxTiefe: 1 });
    expect(ergebnis.dateien.map((d) => [d.pfad, d.groesse])).toEqual([
      ["DJI_0002.JPG", 2],
      ["Flug1/DJI_0001.MP4", 4],
    ]);
    expect(ergebnis.abgeschnitten).toBe(true);
  });

  it("hält sich an die Höchstzahl an Dateien", async () => {
    const ergebnis = await ordnerDurchsuchen(ordner("x", { a: "1", b: "2", c: "3" }), { maxDateien: 2 });
    expect(ergebnis.dateien).toHaveLength(2);
    expect(ergebnis.abgeschnitten).toBe(true);
  });
});

describe("Änderungen erkennen", () => {
  it("meldet neue, geänderte und entfernte Dateien", () => {
    const alt = [
      { pfad: "a.jpg", groesse: 1, geaendert: 1 },
      { pfad: "b.jpg", groesse: 1, geaendert: 1 },
      { pfad: "c.jpg", groesse: 1, geaendert: 1 },
    ];
    const jetzt = [
      { pfad: "a.jpg", groesse: 1, geaendert: 1 },
      { pfad: "b.jpg", groesse: 2, geaendert: 5 },
      { pfad: "d.jpg", groesse: 1, geaendert: 1 },
    ];
    expect(vergleichen(alt, jetzt)).toEqual({ neu: ["b.jpg", "d.jpg"], entfernt: ["c.jpg"] });
  });

  it("zählt erst ab der zweiten Prüfung neue Dateien und merkt sie bis „Gesehen“", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "Übung" });
    // Handles lassen sich in fake-indexeddb nicht ablegen; Name genügt hier.
    const { id } = await ordnerVerknuepfen(db, einsatz.id, { kind: "directory", name: "Drohne" } as OrdnerHandle);
    const d = (pfad: string) => ({ pfad, groesse: 1, geaendert: 1 });

    expect(await ordnerAbgleichen(db, id, [d("a.jpg")], false)).toBe(0);
    expect(await ordnerAbgleichen(db, id, [d("a.jpg"), d("b.jpg")], false)).toBe(1);
    expect(await ordnerAbgleichen(db, id, [d("a.jpg"), d("b.jpg"), d("c.jpg")], false)).toBe(1);
    expect((await db.ordner.get(id))?.neu).toEqual(["b.jpg", "c.jpg"]);

    // Gelöschte Dateien verschwinden auch aus „neu“.
    await ordnerAbgleichen(db, id, [d("a.jpg"), d("c.jpg")], false);
    expect((await db.ordner.get(id))?.neu).toEqual(["c.jpg"]);

    await neueGesehen(db, id);
    expect((await ordnerDesEinsatzes(db, einsatz.id))[0].neu).toEqual([]);
  });

  it("bleibt aus der Sicherung heraus und verschwindet mit dem Einsatz", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "Übung" });
    await ordnerVerknuepfen(db, einsatz.id, { kind: "directory", name: "Fotos" } as OrdnerHandle);
    const sicherung = await exportErstellen(db);
    expect(Object.keys(sicherung.tabellen)).not.toContain("ordner");
    await einsatzLoeschen(db, einsatz.id);
    expect(await db.ordner.count()).toBe(0);
  });
});

describe("groesseText", () => {
  it("zeigt Größen lesbar", () => {
    expect(groesseText(512)).toBe("512 B");
    expect(groesseText(1536)).toBe("1,5 KB");
    expect(groesseText(250 * 1024 * 1024)).toBe("250 MB");
    expect(groesseText(3.2 * 1024 ** 3)).toBe("3,2 GB");
  });
});
