import { crc32 as nodeCrc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { crc32, zipErstellen, ZipFehler, zipPfad } from "./zip";

/** Liest ein unkomprimiertes ZIP über das zentrale Verzeichnis, wie es Entpackprogramme tun. */
async function lesen(blob: Blob) {
  const daten = new Uint8Array(await blob.arrayBuffer());
  const sicht = new DataView(daten.buffer);
  const ende = daten.length - 22;
  expect(sicht.getUint32(ende, true)).toBe(0x06054b50);
  const anzahl = sicht.getUint16(ende + 10, true);
  let pos = sicht.getUint32(ende + 16, true);
  const dateien: { pfad: string; text: string; crcOk: boolean; datum: number; zeit: number }[] = [];
  for (let i = 0; i < anzahl; i++) {
    expect(sicht.getUint32(pos, true)).toBe(0x02014b50);
    const crc = sicht.getUint32(pos + 16, true);
    const groesse = sicht.getUint32(pos + 24, true);
    const nameLaenge = sicht.getUint16(pos + 28, true);
    const lokal = sicht.getUint32(pos + 42, true);
    const pfad = new TextDecoder().decode(daten.subarray(pos + 46, pos + 46 + nameLaenge));
    expect(sicht.getUint32(lokal, true)).toBe(0x04034b50);
    const start = lokal + 30 + sicht.getUint16(lokal + 26, true);
    const inhalt = daten.subarray(start, start + groesse);
    dateien.push({
      pfad,
      text: new TextDecoder().decode(inhalt),
      crcOk: nodeCrc32(inhalt) === crc,
      zeit: sicht.getUint16(pos + 12, true),
      datum: sicht.getUint16(pos + 14, true),
    });
    pos += 46 + nameLaenge;
  }
  return dateien;
}

describe("ZIP", () => {
  it("berechnet CRC-32 wie zlib, auch stückweise", () => {
    const daten = new TextEncoder().encode("Einsatztagebuch Übung ABC 2");
    expect(crc32(daten)).toBe(nodeCrc32(daten));
    expect(crc32(daten.subarray(10), crc32(daten.subarray(0, 10)))).toBe(nodeCrc32(daten));
  });

  it("legt Texte und Dateien mit Umlauten im Namen ab", async () => {
    const zip = await zipErstellen(
      [
        { pfad: "LIESMICH.txt", inhalt: "Hallo" },
        { pfad: "dateien/Drohne/Übersicht.jpg", inhalt: new Blob([new Uint8Array([1, 2, 3, 250])]) },
        { pfad: "leer.csv", inhalt: "" },
      ],
      { jetzt: new Date(2026, 10, 15, 14, 30, 10) },
    );
    expect(zip.type).toBe("application/zip");
    const dateien = await lesen(zip);
    expect(dateien.map((d) => d.pfad)).toEqual(["LIESMICH.txt", "dateien/Drohne/Übersicht.jpg", "leer.csv"]);
    expect(dateien.every((d) => d.crcOk)).toBe(true);
    expect(dateien[0].text).toBe("Hallo");
    expect(dateien[0].datum).toBe(((2026 - 1980) << 9) | (11 << 5) | 15);
    expect(dateien[0].zeit).toBe((14 << 11) | (30 << 5) | 5);
  });

  it("macht doppelte Namen eindeutig", async () => {
    const dateien = await lesen(
      await zipErstellen([
        { pfad: "a/foto.jpg", inhalt: "1" },
        { pfad: "a/FOTO.jpg", inhalt: "2" },
        { pfad: "a/foto.jpg", inhalt: "3" },
      ]),
    );
    expect(dateien.map((d) => d.pfad)).toEqual(["a/foto.jpg", "a/FOTO (2).jpg", "a/foto (3).jpg"]);
  });

  it("meldet den Fortschritt bis 100 %", async () => {
    const werte: number[] = [];
    await zipErstellen([{ pfad: "x", inhalt: "abc" }], { fortschritt: (w) => werte.push(w) });
    expect(werte[0]).toBe(0);
    expect(werte.at(-1)).toBe(1);
  });

  it("lehnt zu viele Dateien ab", async () => {
    const viele = Array.from({ length: 70_000 }, (_, i) => ({ pfad: `${i}`, inhalt: "" }));
    await expect(zipErstellen(viele)).rejects.toThrow(ZipFehler);
  });
});

describe("zipPfad", () => {
  it("entfernt Ausbrüche aus dem Archiv und unzulässige Zeichen", () => {
    expect(zipPfad("../../etc/passwd")).toBe("etc/passwd");
    expect(zipPfad("/abs\\pfad/datei.txt")).toBe("abs/pfad/datei.txt");
    expect(zipPfad('Lage: 14:30 "Nord"?.txt')).toBe("Lage_ 14_30 _Nord__.txt");
    expect(zipPfad("ordner./ ")).toBe("ordner");
    expect(zipPfad("")).toBe("datei");
  });
});
