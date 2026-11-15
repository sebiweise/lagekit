import { describe, expect, it } from "vitest";
import { entfernungMeter, entfernungText, koordinatenText, richtungGrad } from "./standort";

describe("Standort", () => {
  it("formatiert Koordinaten", () => {
    expect(koordinatenText({ lat: 51.3127049, lon: 9.4797 })).toBe("51.31270, 9.47970");
  });
  it("misst Entfernung und Richtung", () => {
    const kassel = { lat: 51.3127, lon: 9.4797 };
    const goettingen = { lat: 51.5413, lon: 9.9158 };
    expect(entfernungMeter(kassel, goettingen)).toBeGreaterThan(39_000);
    expect(entfernungMeter(kassel, goettingen)).toBeLessThan(40_000);
    expect(richtungGrad(kassel, { lat: 52, lon: 9.4797 })).toBeCloseTo(0, 5);
    expect(entfernungText(kassel, { lat: 51.3127, lon: 9.4847 })).toBe("350 m O");
    expect(entfernungText(kassel, goettingen)).toMatch(/^39,\d km NO$/);
  });
});
