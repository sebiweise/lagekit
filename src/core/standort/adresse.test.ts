import { beforeEach, describe, expect, it, vi } from "vitest";
import { _adresseZuruecksetzen, adresseKurz, adresseSuchen, adresseZuKoordinaten } from "./adresse";

beforeEach(() => _adresseZuruecksetzen());

const antwort = (json: unknown) => Promise.resolve(new Response(JSON.stringify(json)));

describe("Adressen", () => {
  it("baut eine kurze Adresse", () => {
    expect(
      adresseKurz({ road: "Obere Königsstraße", house_number: "8", postcode: "34117", city: "Kassel", suburb: "Mitte" }, "x"),
    ).toBe("Obere Königsstraße 8, 34117 Kassel (Mitte)");
    expect(adresseKurz({ village: "Ahnatal" }, "x")).toBe("Ahnatal");
    expect(adresseKurz({}, "Ersatz")).toBe("Ersatz");
  });

  it("fragt die Rückwärtssuche einmal und nimmt danach den Zwischenspeicher", async () => {
    const holen = vi.fn(() =>
      antwort({ lat: "51.3", lon: "9.4", display_name: "lang", address: { road: "Weg", postcode: "1", town: "Ort" } }),
    );
    const k = { lat: 51.312701, lon: 9.479702 };
    expect((await adresseZuKoordinaten(k, holen as never))?.text).toBe("Weg, 1 Ort");
    await adresseZuKoordinaten(k, holen as never);
    expect(holen).toHaveBeenCalledTimes(1);
    expect(String((holen.mock.calls[0] as unknown[])[0])).toContain("lat=51.31270&lon=9.47970");
  });

  it("liefert null, wenn dort keine Adresse ist", async () => {
    expect(await adresseZuKoordinaten({ lat: 0, lon: 0 }, (() => antwort({ error: "Unable to geocode" })) as never)).toBeNull();
  });

  it("sucht Adressen", async () => {
    const holen = vi.fn(() => antwort([{ lat: "1", lon: "2", display_name: "Rathaus, Kassel" }]));
    const r = await adresseSuchen("Rathaus Kassel", holen as never);
    expect(r).toEqual([{ lat: 1, lon: 2, text: "Rathaus, Kassel", lang: "Rathaus, Kassel" }]);
    expect(await adresseSuchen("  ", holen as never)).toEqual([]);
  });
});
