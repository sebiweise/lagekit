import { describe, expect, it, vi } from "vitest";
import {
  abgelaufeneLoeschen,
  schluesselSpeicher,
  speicherImArbeitsspeicher,
  vermitteln,
  warteliste,
  type SchluesselSpeicher,
  type Speicher,
} from "./vermittlung-dienst";

/** Wie `ctx.storage.kv` eines Durable Objects, nur im Arbeitsspeicher. */
function kvImArbeitsspeicher(): SchluesselSpeicher & { werte: Map<string, unknown> } {
  const werte = new Map<string, unknown>();
  return {
    werte,
    get: (s) => werte.get(s),
    put: (s, w) => void werte.set(s, structuredClone(w)),
    delete: (s) => werte.delete(s),
    list: ({ prefix }) => [...werte].filter(([s]) => s.startsWith(prefix)),
  };
}

const ANFRAGE = "LKA1.abcdefghijklmnop";
const ANTWORT = "LKB1.abcdefghijklmnop";

const SPEICHER: [string, () => Speicher][] = [
  ["Arbeitsspeicher", speicherImArbeitsspeicher],
  ["Durable Object", () => schluesselSpeicher(kvImArbeitsspeicher())],
];

describe.each(SPEICHER)("Vermittlungsdienst (%s)", (_name, speicherImArbeitsspeicher) => {
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
    for (let i = 0; i < 600; i++) await vermitteln(s, { aktion: "antwort", anfrageId: crypto.randomUUID() }, "9");
    expect((await vermitteln(s, { aktion: "sitzung" }, "9")).status).toBe(429);
    expect((await vermitteln(s, { aktion: "sitzung" }, "10")).status).toBe(200);
  });

  it("begrenzt Beitrittsanfragen strenger, damit Kurzcodes nicht durchprobiert werden", async () => {
    const s = speicherImArbeitsspeicher();
    for (let i = 0; i < 30; i++) {
      const r = await vermitteln(s, { aktion: "anfrage", kurzcode: "123456", anfrage: ANFRAGE }, "9");
      expect(r.status).toBe(404);
    }
    expect((await vermitteln(s, { aktion: "anfrage", kurzcode: "123456", anfrage: ANFRAGE }, "9")).status).toBe(429);
  });
});

describe("Speicher im Durable Object", () => {
  it("vergisst Einträge nach ihrer Ablaufzeit und räumt sie auf", async () => {
    let jetzt = 1_000_000;
    const kv = kvImArbeitsspeicher();
    const s = schluesselSpeicher(kv, () => jetzt);
    expect(await s.setzenWennFrei("lk:s:1", "a", 60)).toBe(true);
    expect(await s.setzenWennFrei("lk:s:1", "b", 60)).toBe(false);
    await s.anhaengen("lk:q:1", "x", 600);
    await s.anhaengen("lk:q:1", "y", 600);
    jetzt += 61_000;
    expect(await s.lesen("lk:s:1")).toBeNull();
    expect(await s.setzenWennFrei("lk:s:1", "b", 60)).toBe(true);
    expect(abgelaufeneLoeschen(kv, jetzt + 61_000)).toBe(1);
    expect(await s.allesNehmen("lk:q:1")).toEqual(["x", "y"]);
    expect(await s.allesNehmen("lk:q:1")).toEqual([]);
    expect(kv.werte.size).toBe(0);
  });

  it("zählt Aufrufe je Minute und beginnt danach neu", async () => {
    let jetzt = 0;
    const s = schluesselSpeicher(kvImArbeitsspeicher(), () => jetzt);
    expect(await s.zaehlen("lk:r:1", 60)).toBe(1);
    expect(await s.zaehlen("lk:r:1", 60)).toBe(2);
    jetzt += 60_000;
    expect(await s.zaehlen("lk:r:1", 60)).toBe(1);
  });
});

describe("Long-Polling", () => {
  const sitzung = async (s: Speicher) =>
    (await vermitteln(s, { aktion: "sitzung" }, "1")).inhalt as { kurzcode: string; schluessel: string };

  it("Host wartet, bis eine Beitrittsanfrage kommt, und bekommt sie sofort", async () => {
    const s = speicherImArbeitsspeicher();
    const w = warteliste();
    const { kurzcode, schluessel } = await sitzung(s);
    const beginn = Date.now();
    const abholen = vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 25 }, "1", w);
    await new Promise((r) => setTimeout(r, 20));
    const { anfrageId } = (await vermitteln(s, { aktion: "anfrage", kurzcode, anfrage: ANFRAGE }, "2", w)).inhalt as {
      anfrageId: string;
    };
    expect((await abholen).inhalt).toEqual({ anfragen: [{ anfrageId, anfrage: ANFRAGE }], gewartet: true });
    expect(Date.now() - beginn).toBeLessThan(1_000);
  });

  it("Gast wartet auf die Antwort des Hosts", async () => {
    const s = speicherImArbeitsspeicher();
    const w = warteliste();
    const { kurzcode, schluessel } = await sitzung(s);
    const { anfrageId } = (await vermitteln(s, { aktion: "anfrage", kurzcode, anfrage: ANFRAGE }, "2", w)).inhalt as {
      anfrageId: string;
    };
    const antwort = vermitteln(s, { aktion: "antwort", anfrageId, warten: 25 }, "2", w);
    await vermitteln(s, { aktion: "antworten", kurzcode, schluessel, anfrageId, antwort: ANTWORT }, "1", w);
    expect((await antwort).inhalt).toEqual({ status: "zugelassen", antwort: ANTWORT, gewartet: true });
  });

  it("antwortet nach der Wartezeit ohne Neues, und ohne Warteliste sofort", async () => {
    vi.useFakeTimers();
    try {
      const s = speicherImArbeitsspeicher();
      const { kurzcode, schluessel } = await sitzung(s);
      const abholen = vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 25 }, "1", warteliste());
      await vi.advanceTimersByTimeAsync(25_000);
      expect((await abholen).inhalt).toEqual({ anfragen: [], gewartet: true });
      // Ohne Warteliste (Vercel mit Upstash): sofort und ohne „gewartet“.
      expect((await vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 25 }, "1")).inhalt).toEqual({
        anfragen: [],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("eine neue Abfrage verdrängt die ältere, damit keine Anfrage verloren geht", async () => {
    const s = speicherImArbeitsspeicher();
    const w = warteliste();
    const { kurzcode, schluessel } = await sitzung(s);
    // Alter Tab wartet noch, der neu geladene fragt ebenfalls.
    const alt = vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 25 }, "1", w);
    const neu = vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 25 }, "1", w);
    expect((await alt).inhalt).toEqual({ anfragen: [], gewartet: true });
    const { anfrageId } = (await vermitteln(s, { aktion: "anfrage", kurzcode, anfrage: ANFRAGE }, "2", w)).inhalt as {
      anfrageId: string;
    };
    expect((await neu).inhalt).toEqual({ anfragen: [{ anfrageId, anfrage: ANFRAGE }], gewartet: true });
  });

  it("lehnt zu lange Wartezeiten ab", async () => {
    const s = speicherImArbeitsspeicher();
    const { kurzcode, schluessel } = await sitzung(s);
    expect((await vermitteln(s, { aktion: "abholen", kurzcode, schluessel, warten: 600 }, "1")).status).toBe(400);
  });
});
