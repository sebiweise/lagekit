import { describe, expect, it } from "vitest";
import { externeTools, THEMEN, toolNachId } from "./katalog";
import { suchUrl, themenFuerEinsatz, verlaufSortieren, vorschlagen } from "./logic";

const tool = (id: string) => toolNachId(id)!;

describe("Katalog", () => {
  it("hat eindeutige Ids, HTTPS-Adressen, bekannte Themen und ein Prüfdatum", () => {
    expect(new Set(externeTools.map((t) => t.id)).size).toBe(externeTools.length);
    for (const t of externeTools) {
      expect(t.url).toMatch(/^https:\/\//);
      expect(t.themen.length).toBeGreaterThan(0);
      for (const th of t.themen) expect(Object.keys(THEMEN)).toContain(th);
      expect(t.geprueft.am).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.geprueft.wie).not.toBe("");
      if (t.suche) expect(t.suche.muster).toMatch(/^https:\/\/.*\{q\}/);
    }
  });
});

describe("suchUrl", () => {
  it("setzt Begriff und Ort kodiert ins Muster", () => {
    expect(suchUrl(tool("dasoertliche"), "Autohaus Müller", "Bad Hersfeld")).toBe(
      "https://www.dasoertliche.de/?kw=Autohaus%20M%C3%BCller&ci=Bad%20Hersfeld&form_name=search_nat",
    );
  });

  it("hängt den Ort an, wenn das Ziel kein Ortsfeld hat", () => {
    expect(suchUrl(tool("google-maps"), "Rathaus", "Kassel")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rathaus%20Kassel",
    );
    expect(suchUrl(tool("google-maps"), "Rathaus & Markt", "")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rathaus%20%26%20Markt",
    );
  });

  it("baut BAM- und OSM-Suchen", () => {
    expect(suchUrl(tool("bam-dgg"), "UN 1005")).toBe(
      "https://www.dgg.bam.de/dgginfo/search/query?value=UN%201005&partialWord=true&results=all&lang=de",
    );
    expect(suchUrl(tool("openstreetmap"), "Rathaus", "Kassel")).toBe(
      "https://www.openstreetmap.org/search?query=Rathaus%20Kassel",
    );
  });

  it("liefert null ohne Direktsuche", () => {
    expect(suchUrl(tool("gestis"), "Chlor")).toBeNull();
  });
});

describe("themenFuerEinsatz", () => {
  it.each([
    ["ABC 2", "", "gefahrstoff"],
    ["ABC 2", "", "strahlung"],
    ["Gasaustritt", "", "gefahrstoff"],
    ["Ölspur", "B 27", "gefahrstoff"],
    ["TH VU Pkw", "", "fahrzeug"],
    ["VU eingeklemmt", "BAB 7", "fahrzeug"],
    ["B Wald", "", "vegetation"],
    ["Flächenbrand", "", "vegetation"],
    ["Brand", "Waldweg 3", "vegetation"],
    ["Unwetter", "", "wasser"],
    ["Gefahrgut", "UN1005", "gefahrstoff"],
  ])("„%s“ in „%s“ → %s", (stichwort, ort, thema) => {
    expect(themenFuerEinsatz({ stichwort, ort })).toContain(thema);
  });

  it("schlägt bei kurzen Schlagworten nur ganze Wörter vor", () => {
    const themen = themenFuerEinsatz({ stichwort: "Brand Unterkunft", ort: "Vulkanstraße" });
    expect(themen).not.toContain("gefahrstoff");
    expect(themen).not.toContain("fahrzeug");
  });
});

describe("vorschlagen", () => {
  it("zeigt ohne Einsatz alle Tools ohne Vorschläge", () => {
    const { vorgeschlagen, weitere } = vorschlagen(externeTools, null);
    expect(vorgeschlagen).toEqual([]);
    expect(weitere).toEqual(externeTools);
  });

  it("macht keine Vorschläge, wenn nur Kontakte und Karten passen", () => {
    expect(vorschlagen(externeTools, { stichwort: "Brand Wohnung", ort: "" }).vorgeschlagen).toEqual([]);
  });

  it("stellt fachliche Treffer vor Kontakte und Karten und behält alle Tools", () => {
    const { vorgeschlagen, weitere } = vorschlagen(externeTools, { stichwort: "TH VU Pkw", ort: "A 7" });
    const ids = vorgeschlagen.map((t) => t.id);
    expect(ids.slice(0, 2)).toEqual(["adac-rettungskarten", "euro-rescue"]);
    expect(ids).toContain("openstreetmap");
    expect(ids).toContain("google-maps");
    expect(ids).not.toContain("gestis");
    expect([...vorgeschlagen, ...weitere].length).toBe(externeTools.length);
  });
});

it("sortiert den Verlauf neueste zuerst", () => {
  const liste = [{ zeitpunkt: "2026-11-14T10:00:00.000Z" }, { zeitpunkt: "2026-11-14T12:00:00.000Z" }];
  expect(verlaufSortieren(liste)[0].zeitpunkt).toBe("2026-11-14T12:00:00.000Z");
});
