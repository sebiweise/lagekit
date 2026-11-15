import { describe, expect, it } from "vitest";
import { utmref } from "./utmref";

// Vergleichswerte aus der Referenzbibliothek GeoTrans (Python-Paket „mgrs“).
describe("UTMREF", () => {
  it.each([
    [51.3127, 9.4797, "32U NB 33433 84708"],
    [50.9413, 6.9583, "32U LB 56560 45282"],
    [48.1371, 11.5754, "32U PU 91596 34746"],
    [38.8895, -77.0353, "18S UJ 23478 06483"],
    [-33.8568, 151.2153, "56H LH 34900 52288"],
    [60.39, 5.32, "32V KN 97230 00510"],
  ])("%f, %f → %s", (lat, lon, erwartet) => {
    const r = utmref(lat, lon)!;
    // Höchstens 1 m Abweichung durch Rundung.
    const [z, q, o, n] = r.split(" ");
    const [ez, eq, eo, en] = erwartet.split(" ");
    expect(`${z} ${q}`).toBe(`${ez} ${eq}`);
    expect(Math.abs(Number(o) - Number(eo))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(n) - Number(en))).toBeLessThanOrEqual(1);
  });

  it("liefert nichts außerhalb des Gültigkeitsbereichs", () => {
    expect(utmref(85, 0)).toBeNull();
    expect(utmref(Number.NaN, 0)).toBeNull();
  });
});
