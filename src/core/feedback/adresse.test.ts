import { describe, expect, it } from "vitest";
import { feedbackEndpunkt } from "./adresse";

const GEHOSTET = "https://feedback.sebiweise.workers.dev/v1/feedback/lagekit";

describe("feedbackEndpunkt", () => {
  it("nutzt ohne Angabe und bei true den gehosteten Dienst", () => {
    for (const wert of [undefined, null, "", " true ", "TRUE", "1", "ja"]) expect(feedbackEndpunkt(wert)).toBe(GEHOSTET);
  });

  it("schaltet das Formular mit false aus", () => {
    for (const wert of ["false", "FALSE", "0", "aus", "nein"]) expect(feedbackEndpunkt(wert)).toBeNull();
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
