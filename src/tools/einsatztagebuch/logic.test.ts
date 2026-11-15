import { describe, expect, it } from "vitest";
import {
  chronologisch,
  ergaenzungFinden,
  filtern,
  korrekturen,
  naechsteNummer,
  uhrzeitAnwenden,
  vonAnVorschlaege,
  vorschlaegeFiltern,
} from "./logic";
import type { Eintrag } from "./schema";

let zaehler = 0;
function eintrag(teil: Partial<Eintrag>): Eintrag {
  zaehler++;
  return {
    id: `00000000-0000-4000-8000-${String(zaehler).padStart(12, "0")}`,
    einsatzId: "00000000-0000-4000-8000-ffffffffffff",
    nr: zaehler,
    zeitpunkt: "2026-11-14T10:00:00.000Z",
    erfasstAm: "2026-11-14T10:00:00.000Z",
    art: "Meldung",
    von: "",
    an: "",
    inhalt: "Text",
    verfasser: "",
    korrigiertEintragId: null,
    ...teil,
  };
}

describe("naechsteNummer", () => {
  it("zählt ab 1 und lückenlos nach dem Höchstwert", () => {
    expect(naechsteNummer([])).toBe(1);
    expect(naechsteNummer([{ nr: 1 }, { nr: 4 }, { nr: 2 }])).toBe(5);
  });
});

describe("uhrzeitAnwenden", () => {
  const jetzt = new Date(2026, 10, 14, 15, 30, 20);

  it("setzt die Uhrzeit auf heute", () => {
    expect(uhrzeitAnwenden(jetzt, "14:05")).toEqual(new Date(2026, 10, 14, 14, 5, 0));
    expect(uhrzeitAnwenden(jetzt, "1405")).toEqual(new Date(2026, 10, 14, 14, 5, 0));
    expect(uhrzeitAnwenden(jetzt, "9.15")).toEqual(new Date(2026, 10, 14, 9, 15, 0));
  });

  it("nimmt den Vortag, wenn die Zeit sonst in der Zukunft läge", () => {
    expect(uhrzeitAnwenden(jetzt, "15:34")).toEqual(new Date(2026, 10, 14, 15, 34, 0));
    expect(uhrzeitAnwenden(jetzt, "23:50")).toEqual(new Date(2026, 10, 13, 23, 50, 0));
  });

  it("lehnt Unsinn ab", () => {
    expect(uhrzeitAnwenden(jetzt, "25:00")).toBeNull();
    expect(uhrzeitAnwenden(jetzt, "12:60")).toBeNull();
    expect(uhrzeitAnwenden(jetzt, "mittags")).toBeNull();
  });
});

describe("korrekturen", () => {
  it("ordnet jedem korrigierten Eintrag die neueste Korrektur zu", () => {
    const alt = eintrag({ nr: 1 });
    const k1 = eintrag({ nr: 2, korrigiertEintragId: alt.id });
    const k2 = eintrag({ nr: 3, korrigiertEintragId: alt.id });
    const map = korrekturen([k2, alt, k1]);
    expect(map.get(alt.id)?.nr).toBe(3);
    expect(map.has(k1.id)).toBe(false);
  });
});

describe("filtern", () => {
  const liste = [
    eintrag({ art: "Meldung", inhalt: "Lage an Einsatzstelle unverändert", von: "Florian 1" }),
    eintrag({ art: "Befehl", inhalt: "Messtrupp zu Messpunkt 3", an: "ABC-Erkunder" }),
    eintrag({ art: "Notiz", inhalt: "Kaffee bestellt", verfasser: "Weber" }),
  ];

  it("filtert nach Arten", () => {
    expect(filtern(liste, { arten: new Set(["Befehl", "Notiz"]), suche: "" })).toHaveLength(2);
    expect(filtern(liste, { arten: new Set(), suche: "" })).toHaveLength(3);
  });

  it("sucht alle Wörter in Inhalt, von, an und Verfasser", () => {
    expect(filtern(liste, { arten: new Set(), suche: "florian lage" })).toHaveLength(1);
    expect(filtern(liste, { arten: new Set(), suche: "abc-erkunder" })).toHaveLength(1);
    expect(filtern(liste, { arten: new Set(), suche: "WEBER" })).toHaveLength(1);
    expect(filtern(liste, { arten: new Set(["Befehl"]), suche: "kaffee" })).toHaveLength(0);
  });
});

describe("chronologisch", () => {
  it("sortiert nach Ereigniszeit, nicht nach Erfassung", () => {
    const spaet = eintrag({ nr: 1, zeitpunkt: "2026-11-14T11:00:00.000Z" });
    const nachgetragen = eintrag({ nr: 2, zeitpunkt: "2026-11-14T10:30:00.000Z" });
    expect(chronologisch([spaet, nachgetragen]).map((e) => e.nr)).toEqual([2, 1]);
  });
});

describe("vonAnVorschlaege", () => {
  const e = (einsatzId: string, nr: number, von: string, an: string) => ({
    einsatzId,
    nr,
    erfasstAm: `2026-11-15T10:${String(nr).padStart(2, "0")}:00.000Z`,
    von,
    an,
  });

  it("nimmt von und an, zuletzt genutzte zuerst, ohne Doppelte", () => {
    const liste = [e("a", 1, "ELW 1", "Leitstelle"), e("a", 2, "HLF 20", "ELW 1"), e("a", 3, "leitstelle", "")];
    expect(vonAnVorschlaege(liste, "a")).toEqual(["leitstelle", "HLF 20", "ELW 1"]);
  });

  it("stellt den aktuellen Einsatz vor andere Einsätze", () => {
    const liste = [e("b", 9, "DLK 23", ""), e("a", 1, "ELW 1", "")];
    expect(vonAnVorschlaege(liste, "a")).toEqual(["ELW 1", "DLK 23"]);
  });

  it("überspringt leere Angaben", () => {
    expect(vonAnVorschlaege([e("a", 1, "  ", "")], "a")).toEqual([]);
  });
});

describe("vorschlaegeFiltern", () => {
  const liste = ["ELW 1", "HLF 20", "Leitstelle", "Abschnitt Nord", "TLF 3000 Wehr Süd"];

  it("ordnet Anfang vor Wortanfang vor enthalten, ohne Groß/Klein", () => {
    expect(vorschlaegeFiltern(liste, "l")).toEqual(["Leitstelle", "ELW 1", "HLF 20", "TLF 3000 Wehr Süd"]);
    expect(vorschlaegeFiltern(liste, "nord")).toEqual(["Abschnitt Nord"]);
    expect(vorschlaegeFiltern(liste, "itst")).toEqual(["Leitstelle"]);
  });

  it("schlägt den eingegebenen Wert nicht selbst vor", () => {
    expect(vorschlaegeFiltern(liste, "elw 1")).toEqual([]);
  });

  it("liefert bei leerer Eingabe alle, begrenzt", () => {
    expect(vorschlaegeFiltern(liste, "", 2)).toEqual(["ELW 1", "HLF 20"]);
  });
});

describe("ergaenzungFinden", () => {
  const liste = ["Leitstelle", "ELW 1", "ELW 2"];

  it("ergänzt den ersten Vorschlag mit gleichem Anfang", () => {
    expect(ergaenzungFinden(liste, "elw")).toBe("ELW 1");
    expect(ergaenzungFinden(liste, "ELW ")).toBe("ELW 1");
    expect(ergaenzungFinden(liste, "Le")).toBe("Leitstelle");
  });

  it("ergänzt nichts bei leerer, vollständiger oder fremder Eingabe", () => {
    expect(ergaenzungFinden(liste, "")).toBeNull();
    expect(ergaenzungFinden(liste, "ELW 1")).toBeNull();
    expect(ergaenzungFinden(liste, "itst")).toBeNull();
  });
});
