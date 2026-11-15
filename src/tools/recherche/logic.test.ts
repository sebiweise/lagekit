import { describe, expect, it } from "vitest";
import { externeTools, THEMEN, toolNachId } from "./katalog";
import { begriffErkennen, suchUrl, suchziele, themenFuerEinsatz, verlaufSortieren, vorschlagen } from "./logic";

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
      if (t.unMuster) expect(t.unMuster).toMatch(/^https:\/\/.*\{un\}/);
    }
  });
});

describe("suchUrl", () => {
  it("setzt Begriff und Ort kodiert ins Muster", () => {
    expect(suchUrl(tool("dasoertliche"), "Autohaus Müller", "Bad Hersfeld")).toBe(
      "https://mobil.dasoertliche.de/Themen?was=Autohaus%20M%C3%BCller&wo=Bad%20Hersfeld",
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

  it("springt bei UN-Nummern direkt zum CAMEO-Datenblatt, ohne führende Nullen", () => {
    expect(suchUrl(tool("cameo"), "1005", "", "un")).toBe("https://cameochemicals.noaa.gov/unna/1005");
    expect(suchUrl(tool("cameo"), "0004", "", "un")).toBe("https://cameochemicals.noaa.gov/unna/4");
    expect(suchUrl(tool("cameo"), "Ammonia")).toBeNull();
  });

  it("sucht in PubChem nach Name und CAS-Nummer, nicht nach UN-Nummer", () => {
    expect(suchUrl(tool("pubchem"), "7664-41-7", "", "cas")).toBe("https://pubchem.ncbi.nlm.nih.gov/compound/7664-41-7");
    expect(suchUrl(tool("pubchem"), "ammonia")).toBe("https://pubchem.ncbi.nlm.nih.gov/compound/ammonia");
    expect(suchUrl(tool("pubchem"), "1005", "", "un")).toBeNull();
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
    ["Unwetter Gewitter", "", "warnung"],
    ["Gewässerverunreinigung", "", "wasser"],
    ["Person im Forst", "", "vegetation"],
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

describe("begriffErkennen", () => {
  it.each([
    ["1005", "un", "1005"],
    ["UN 1005", "un", "1005"],
    ["un1203", "un", "1203"],
    ["7664-41-7", "cas", "7664-41-7"],
    ["Chlor", "text", "Chlor"],
    ["12345", "text", "12345"],
  ])("„%s“ → %s", (begriff, art, wert) => {
    expect(begriffErkennen(begriff)).toEqual({ art, wert });
  });
});

describe("suchziele", () => {
  it("schickt UN-Nummern nur an Stoffdatenbanken", () => {
    const z = suchziele(externeTools, "UN 1005", null);
    expect(z.direkt.map((t) => t.id)).toEqual(["bam-dgg", "cameo"]);
    expect(z.kopieren.map((t) => t.id)).toEqual(expect.arrayContaining(["gestis", "ericards", "pubchem"]));
    expect(z.kopieren.map((t) => t.id)).not.toContain("adac-rettungskarten");
  });

  it("bietet bei Text alle Direktsuchen, passend zum Einsatz zuerst", () => {
    const z = suchziele(externeTools, "Rathaus", { stichwort: "TH VU", ort: "Kassel" });
    expect(z.direkt.map((t) => t.id)).toEqual(expect.arrayContaining(["dasoertliche", "google-maps", "openstreetmap", "bam-dgg"]));
    expect(z.kopieren[0].id).toBe("adac-rettungskarten");
  });

  it("schickt CAS-Nummern direkt an BAM und PubChem", () => {
    const z = suchziele(externeTools, "7664-41-7", null);
    expect(z.direkt.map((t) => t.id)).toEqual(["bam-dgg", "pubchem"]);
  });
});
