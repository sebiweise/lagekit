import { describe, expect, it } from "vitest";
import { dienstEndpunkt, dienstEndpunktBeimBuild } from "./dienst-adresse";

const GEHOSTET = "https://lagekit-kurzcode.sebiweise.workers.dev/api/vermittlung/";

describe("dienstEndpunkt", () => {
  it("nutzt ohne Angabe und bei true den gehosteten Dienst", () => {
    for (const wert of [undefined, null, "", " true ", "TRUE", "1", "ja"]) expect(dienstEndpunkt(wert)).toBe(GEHOSTET);
  });

  it("schaltet den Kurzcode mit false aus", () => {
    for (const wert of ["false", "FALSE", "0", "aus", "nein"]) expect(dienstEndpunkt(wert)).toBeNull();
  });

  it("nutzt mit selbst den Dienst derselben Installation", () => {
    expect(dienstEndpunkt("selbst")).toBe("/api/vermittlung/");
  });

  it("hängt den Pfad an eine eigene Adresse an, mit Schrägstrich am Ende", () => {
    expect(dienstEndpunkt("https://lagekit.example.de")).toBe("https://lagekit.example.de/api/vermittlung/");
    expect(dienstEndpunkt("https://lagekit.example.de/")).toBe("https://lagekit.example.de/api/vermittlung/");
    expect(dienstEndpunkt("https://example.de/lagekit/api/vermittlung")).toBe(
      "https://example.de/lagekit/api/vermittlung/",
    );
  });

  it("lehnt Unsinn ab", () => {
    expect(() => dienstEndpunkt("vielleicht")).toThrow(/LAGEKIT_KURZCODE_DIENST/);
    expect(() => dienstEndpunkt("ftp://example.de")).toThrow(/https/);
  });
});

describe("dienstEndpunktBeimBuild", () => {
  it("nimmt auf Vercel mit Upstash ohne Angabe den eigenen Dienst, sonst den gehosteten", () => {
    expect(dienstEndpunktBeimBuild({ VERCEL: "1", KV_REST_API_URL: "https://u", KV_REST_API_TOKEN: "t" })).toBe(
      "/api/vermittlung/",
    );
    expect(dienstEndpunktBeimBuild({ VERCEL: "1" })).toBe(GEHOSTET);
    expect(dienstEndpunktBeimBuild({})).toBe(GEHOSTET);
    expect(dienstEndpunktBeimBuild({ VERCEL: "1", LAGEKIT_KURZCODE_DIENST: "false" })).toBeNull();
  });
});
