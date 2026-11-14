import { describe, expect, it } from "vitest";
import {
  ampel,
  aufenthaltDosis,
  dauerStunden,
  dosimeterSumme,
  formatDosis,
  gesamtdosis,
  maxAufenthaltStunden,
  odlInMsvProStunde,
  rechenweg,
  rechenwegVorplanung,
  restdosis,
  richtwertErreichtUm,
} from "./logic";
import type { Aufenthalt } from "./schema";

const basis = {
  id: "00000000-0000-4000-8000-000000000001",
  einsatzId: "00000000-0000-4000-8000-000000000002",
  personId: "00000000-0000-4000-8000-000000000003",
  ort: "Messpunkt 1",
  dosimeterMsv: null,
  erstelltAm: "2026-11-14T10:00:00.000Z",
} as const;

function aufenthalt(teil: Partial<Aufenthalt>): Aufenthalt {
  return {
    ...basis,
    beginn: "2026-11-14T10:00:00.000Z",
    ende: "2026-11-14T11:00:00.000Z",
    odl: 1,
    odlEinheit: "mSv/h",
    ...teil,
  };
}

const jetzt = new Date("2026-11-14T12:00:00.000Z");

describe("Einheiten und Dauer", () => {
  it("rechnet µSv/h und Sv/h in mSv/h um", () => {
    expect(odlInMsvProStunde(250, "µSv/h")).toBeCloseTo(0.25, 12);
    expect(odlInMsvProStunde(2.5, "mSv/h")).toBe(2.5);
    expect(odlInMsvProStunde(0.2, "Sv/h")).toBeCloseTo(200, 12);
  });

  it("misst die Dauer in Stunden und nie negativ", () => {
    expect(dauerStunden("2026-11-14T10:00:00Z", "2026-11-14T11:30:00Z")).toBe(1.5);
    expect(dauerStunden("2026-11-14T10:00:00Z", "2026-11-14T10:00:36Z")).toBeCloseTo(0.01, 12);
    expect(dauerStunden("2026-11-14T11:00:00Z", "2026-11-14T10:00:00Z")).toBe(0);
  });
});

describe("Dosis D = Ḣ · t", () => {
  it("rechnet einen abgeschlossenen Aufenthalt (Whiteboard-Beispiel)", () => {
    // 250 µSv/h für 1 h 30 min → 0,375 mSv
    const b = aufenthaltDosis(
      aufenthalt({ odl: 250, odlEinheit: "µSv/h", ende: "2026-11-14T11:30:00.000Z" }),
      jetzt,
    );
    expect(b.dosisMsv).toBeCloseTo(0.375, 12);
    expect(b.laufend).toBe(false);
    expect(rechenweg(b)).toBe("D = 0,250 mSv/h × 1,5000 h = 0,375 mSv");
  });

  it("rechnet einen laufenden Aufenthalt bis jetzt", () => {
    const b = aufenthaltDosis(aufenthalt({ odl: 2, ende: null }), jetzt);
    expect(b).toMatchObject({ laufend: true, dauerH: 2, dosisMsv: 4 });
  });

  it("summiert alle Aufenthalte zur Gesamtdosis", () => {
    const liste = [
      aufenthalt({ odl: 1, odlEinheit: "mSv/h" }), // 1 h → 1 mSv
      aufenthalt({ odl: 500, odlEinheit: "µSv/h", beginn: "2026-11-14T11:00:00Z", ende: "2026-11-14T11:30:00Z" }), // 0,25 mSv
      aufenthalt({ odl: 3, ende: null, beginn: "2026-11-14T11:40:00Z" }), // 20 min → 1 mSv
    ];
    expect(gesamtdosis(liste, jetzt)).toBeCloseTo(2.25, 12);
    expect(gesamtdosis([], jetzt)).toBe(0);
  });

  it("summiert Dosimeterwerte nur, wenn welche erfasst sind", () => {
    expect(dosimeterSumme([aufenthalt({})])).toBeNull();
    expect(dosimeterSumme([aufenthalt({ dosimeterMsv: 0.4 }), aufenthalt({ dosimeterMsv: 0.1 }), aufenthalt({})])).toBeCloseTo(0.5, 12);
  });
});

describe("Ampel und Restdosis", () => {
  it("zeigt Grün, Gelb ab 80 % und Rot ab dem Richtwert", () => {
    expect(ampel(79.9, 100)).toBe("gruen");
    expect(ampel(80, 100)).toBe("gelb");
    expect(ampel(99.99, 100)).toBe("gelb");
    expect(ampel(100, 100)).toBe("rot");
  });

  it("nimmt den höheren Wert aus Rechnung und Dosimeter", () => {
    expect(ampel(10, 100, 85)).toBe("gelb");
    expect(ampel(90, 100, 10)).toBe("gelb");
  });

  it("liefert nie eine negative Restdosis", () => {
    expect(restdosis(30, 100)).toBe(70);
    expect(restdosis(120, 100)).toBe(0);
  });
});

describe("Vorplanung t = D / Ḣ", () => {
  it("berechnet die zulässige Aufenthaltsdauer", () => {
    expect(maxAufenthaltStunden(98, 5)).toBeCloseTo(19.6, 12);
    expect(maxAufenthaltStunden(0, 5)).toBe(0);
    expect(maxAufenthaltStunden(10, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(rechenwegVorplanung(100, 2, 5)).toBe("t = (100,000 mSv − 2,000 mSv) / 5,000 mSv/h = 19,60 h");
    expect(rechenwegVorplanung(100, 2, 0)).toMatch(/unbegrenzt$/);
  });

  it("nennt den Zeitpunkt, zu dem der Richtwert erreicht ist", () => {
    expect(richtwertErreichtUm(jetzt, 1, 2)?.toISOString()).toBe("2026-11-14T12:30:00.000Z");
    expect(richtwertErreichtUm(jetzt, 1, 0)).toBeNull();
  });
});

describe("Darstellung", () => {
  it("zeigt Dosen mit drei Nachkommastellen und Komma", () => {
    expect(formatDosis(0.0125)).toBe("0,013 mSv");
    expect(formatDosis(15)).toBe("15,000 mSv");
  });
});
