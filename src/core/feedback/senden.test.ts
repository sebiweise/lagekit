import { describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import { feedbackBody, feedbackFormularSchema, feedbackSenden, plattform } from "./senden";

const DIAGNOSE = { appVersion: "0.11.0", platform: "Windows, Browser" };
const ENDPUNKT = "https://feedback.example.de/v1/feedback/lagekit";

function eingabe(werte: Partial<Record<string, unknown>> = {}) {
  return feedbackFormularSchema.parse({
    art: "bug",
    nachricht: "  Die Karte lädt nicht.  ",
    email: "",
    diagnose: false,
    website: "",
    ...werte,
  });
}

describe("feedbackFormularSchema", () => {
  it("verlangt mindestens 10 Zeichen nach dem Trimmen", () => {
    const ergebnis = feedbackFormularSchema.safeParse({ art: "wish", nachricht: "  kurz    ", email: "", diagnose: true, website: "" });
    expect(ergebnis.success).toBe(false);
    expect(ergebnis.error?.issues[0]?.message).toBe(t.feedback.zuKurz(10));
  });

  it("lässt die E-Mail leer zu, prüft sie sonst", () => {
    expect(eingabe().email).toBe("");
    expect(() => eingabe({ email: "keine-adresse" })).toThrow();
    expect(eingabe({ email: "a@example.de" }).email).toBe("a@example.de");
  });

  it("kennt nur die Arten des Diensts", () => {
    expect(() => eingabe({ art: "lob" })).toThrow();
  });
});

describe("feedbackBody", () => {
  it("schickt nur Art, Text, Quelle und das leere Falle-Feld, ohne E-Mail und Diagnose", () => {
    expect(feedbackBody(eingabe(), DIAGNOSE)).toEqual({
      kind: "bug",
      message: "Die Karte lädt nicht.",
      source: "web",
      website: "",
    });
  });

  it("nimmt E-Mail und Diagnose (nur Version und Plattform) mit, wenn gewünscht", () => {
    const body = feedbackBody(eingabe({ email: "a@example.de", diagnose: true }), DIAGNOSE);
    expect(body).toMatchObject({ email: "a@example.de", diagnostics: DIAGNOSE });
    expect(Object.keys(body.diagnostics ?? {})).toEqual(["appVersion", "platform"]);
  });
});

describe("plattform", () => {
  it("nennt nur eine grobe Plattform aus einer festen Liste", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(plattform(iphone, undefined, true)).toBe("iOS, installierte App");
    expect(plattform("Mozilla/5.0 (Linux; Android 15; Pixel 9)", undefined, false)).toBe("Android, Browser");
    expect(plattform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Windows", false)).toBe("Windows, Browser");
    expect(plattform("Seltsamer Browser/1.0", undefined, false)).toBe("unbekannt, Browser");
  });
});

describe("feedbackSenden", () => {
  const body = feedbackBody(eingabe(), DIAGNOSE);

  it("schickt offline keine Anfrage", async () => {
    const abrufen = vi.fn<typeof fetch>();
    expect(await feedbackSenden(ENDPUNKT, body, { online: false, fetch: abrufen })).toEqual({
      ok: false,
      code: "offline",
      fehler: t.feedback.offline,
    });
    expect(abrufen).not.toHaveBeenCalled();
  });

  it("schickt JSON mit deutscher Sprache und ohne Cookies", async () => {
    const abrufen = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }, { status: 201 }));
    expect(await feedbackSenden(ENDPUNKT, body, { fetch: abrufen })).toEqual({ ok: true });
    const [adresse, init] = abrufen.mock.calls[0]!;
    expect(adresse).toBe(ENDPUNKT);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json", "accept-language": "de" },
    });
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });

  it("zeigt den Fehlertext des Diensts", async () => {
    const abrufen = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: false, error: "Zu viele Anfragen.", code: "rateLimited" }, { status: 429 }));
    expect(await feedbackSenden(ENDPUNKT, body, { fetch: abrufen })).toEqual({
      ok: false,
      code: "rateLimited",
      fehler: "Zu viele Anfragen.",
    });
  });

  it("hat einen eigenen Text, wenn die Antwort kein JSON ist oder das Netz fehlt", async () => {
    const html = vi.fn<typeof fetch>().mockResolvedValue(new Response("<h1>Bad Gateway</h1>", { status: 502 }));
    expect(await feedbackSenden(ENDPUNKT, body, { fetch: html })).toEqual({
      ok: false,
      code: "http502",
      fehler: t.feedback.fehler(502),
    });
    const kaputt = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await feedbackSenden(ENDPUNKT, body, { fetch: kaputt })).toEqual({
      ok: false,
      code: "netz",
      fehler: t.feedback.nichtErreichbar,
    });
  });
});
