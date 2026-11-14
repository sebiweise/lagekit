import { describe, expect, it } from "vitest";
import { speicherImArbeitsspeicher, vermitteln } from "./vermittlung-dienst";

const ANFRAGE = "LKA1.abcdefghijklmnop";
const ANTWORT = "LKB1.abcdefghijklmnop";

describe("Vermittlungsdienst", () => {
  it("vermittelt Anfrage und Antwort zwischen Gast und Host", async () => {
    const s = speicherImArbeitsspeicher();
    const sitzung = await vermitteln(s, { aktion: "sitzung" }, "1");
    const { kurzcode, schluessel } = sitzung.inhalt as { kurzcode: string; schluessel: string };
    expect(kurzcode).toMatch(/^\d{6}$/);

    const anfrage = await vermitteln(s, { aktion: "anfrage", kurzcode, anfrage: ANFRAGE }, "2");
    const { anfrageId } = anfrage.inhalt as { anfrageId: string };
    expect((await vermitteln(s, { aktion: "antwort", anfrageId }, "2")).inhalt).toEqual({ status: "wartet" });

    const abgeholt = await vermitteln(s, { aktion: "abholen", kurzcode, schluessel }, "1");
    expect(abgeholt.inhalt).toEqual({ anfragen: [{ anfrageId, anfrage: ANFRAGE }] });
    expect((await vermitteln(s, { aktion: "abholen", kurzcode, schluessel }, "1")).inhalt).toEqual({ anfragen: [] });

    await vermitteln(s, { aktion: "antworten", kurzcode, schluessel, anfrageId, antwort: ANTWORT }, "1");
    expect((await vermitteln(s, { aktion: "antwort", anfrageId }, "2")).inhalt).toEqual({
      status: "zugelassen",
      antwort: ANTWORT,
    });
    // Danach ist die Antwort verbraucht.
    expect((await vermitteln(s, { aktion: "antwort", anfrageId }, "2")).status).toBe(404);
  });

  it("verlangt den Host-Schlüssel und kennt abgelaufene Codes nicht", async () => {
    const s = speicherImArbeitsspeicher();
    const { kurzcode } = (await vermitteln(s, { aktion: "sitzung" }, "1")).inhalt as { kurzcode: string };
    const falsch = crypto.randomUUID();
    expect((await vermitteln(s, { aktion: "abholen", kurzcode, schluessel: falsch }, "1")).status).toBe(403);
    const anderer = kurzcode === "000000" ? "000001" : "000000";
    expect((await vermitteln(s, { aktion: "anfrage", kurzcode: anderer, anfrage: ANFRAGE }, "2")).status).toBe(404);
    expect((await vermitteln(s, { aktion: "unsinn" }, "2")).status).toBe(400);
  });

  it("meldet eine Ablehnung an den Gast", async () => {
    const s = speicherImArbeitsspeicher();
    const { kurzcode, schluessel } = (await vermitteln(s, { aktion: "sitzung" }, "1")).inhalt as {
      kurzcode: string;
      schluessel: string;
    };
    const { anfrageId } = (await vermitteln(s, { aktion: "anfrage", kurzcode, anfrage: ANFRAGE }, "2")).inhalt as {
      anfrageId: string;
    };
    await vermitteln(s, { aktion: "antworten", kurzcode, schluessel, anfrageId, antwort: null }, "1");
    expect((await vermitteln(s, { aktion: "antwort", anfrageId }, "2")).inhalt).toEqual({ status: "abgelehnt" });
  });

  it("begrenzt die Zahl der Aufrufe je Adresse", async () => {
    const s = speicherImArbeitsspeicher();
    for (let i = 0; i < 120; i++) await vermitteln(s, { aktion: "antwort", anfrageId: crypto.randomUUID() }, "9");
    expect((await vermitteln(s, { aktion: "sitzung" }, "9")).status).toBe(429);
  });
});
