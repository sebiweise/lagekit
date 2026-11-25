import { describe, expect, it } from "vitest";
import { feedbackEndpunkt, feedbackEndpunktBeimBuild } from "./adresse";

const GEHOSTET = "https://feedback.sebiweise.workers.dev/v1/feedback/lagekit";

describe("feedbackEndpunkt", () => {
  it("nutzt bei true den gehosteten Dienst", () => {
    for (const wert of [" true ", "TRUE", "1", "ja"]) expect(feedbackEndpunkt(wert)).toBe(GEHOSTET);
  });

  it("schaltet das Formular ohne Angabe und mit false aus", () => {
    for (const wert of [undefined, null, "", "false", "FALSE", "0", "aus", "nein"]) expect(feedbackEndpunkt(wert)).toBeNull();
  });

  it("hängt Pfad und Projekt an eine eigene Adresse an, aber nur einmal", () => {
    expect(feedbackEndpunkt("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787/v1/feedback/lagekit");
    expect(feedbackEndpunkt("https://example.de/dienst/")).toBe("https://example.de/dienst/v1/feedback/lagekit");
    expect(feedbackEndpunkt(GEHOSTET)).toBe(GEHOSTET);
  });

  it("lehnt Unsinn ab", () => {
    expect(() => feedbackEndpunkt("vielleicht")).toThrow(/LAGEKIT_FEEDBACK_URL/);
    expect(() => feedbackEndpunkt("ftp://example.de")).toThrow(/https/);
  });
});

describe("feedbackEndpunktBeimBuild", () => {
  const vercel = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "lagekit.vercel.app" };

  it("ist ohne Angabe nur im Produktions-Build des Projekts an", () => {
    expect(feedbackEndpunktBeimBuild(vercel)).toBe(GEHOSTET);
    expect(feedbackEndpunktBeimBuild({ ...vercel, LAGEKIT_FEEDBACK_URL: "" })).toBe(GEHOSTET);
  });

  it("bleibt ohne Angabe in Forks, Vorschauen und eigenen Builds aus", () => {
    expect(feedbackEndpunktBeimBuild({})).toBeNull();
    expect(feedbackEndpunktBeimBuild({ ...vercel, VERCEL_ENV: "preview" })).toBeNull();
    expect(feedbackEndpunktBeimBuild({ ...vercel, VERCEL_PROJECT_PRODUCTION_URL: "mein-lagekit.vercel.app" })).toBeNull();
  });

  it("folgt einer ausdrücklichen Angabe", () => {
    expect(feedbackEndpunktBeimBuild({ LAGEKIT_FEEDBACK_URL: "true" })).toBe(GEHOSTET);
    expect(feedbackEndpunktBeimBuild({ ...vercel, LAGEKIT_FEEDBACK_URL: "false" })).toBeNull();
  });
});
