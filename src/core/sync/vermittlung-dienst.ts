/**
 * Vermittlungsdienst für den Kurzcode-Weg. Läuft als Cloudflare Worker
 * (cloudflare/worker.ts), als Node-Server neben Redis (server/vermittlung.ts, Docker
 * Compose) oder als Vercel-Funktion mit Upstash (api/vermittlung.ts).
 *
 * Speichert nur Beitrittsanfragen und Antworten (Verbindungsdaten) für wenige
 * Minuten. Einsatzdaten laufen nie über den Dienst. Diese Datei hat keine
 * Abhängigkeiten außer Zod, damit sie überall und in Tests läuft.
 */
import { z } from "zod";

export interface Speicher {
  /** Setzt den Wert nur, wenn der Schlüssel frei ist. */
  setzenWennFrei(schluessel: string, wert: string, sekunden: number): Promise<boolean>;
  lesen(schluessel: string): Promise<string | null>;
  setzen(schluessel: string, wert: string, sekunden: number): Promise<void>;
  loeschen(...schluessel: string[]): Promise<void>;
  anhaengen(schluessel: string, wert: string, sekunden: number): Promise<void>;
  /** Liefert alle Listeneinträge und leert die Liste. */
  allesNehmen(schluessel: string): Promise<string[]>;
  /** Zählt hoch und gibt den neuen Stand zurück (für die Begrenzung von Anfragen). */
  zaehlen(schluessel: string, sekunden: number): Promise<number>;
}

const SITZUNG_SEKUNDEN = 12 * 60 * 60;
const ANFRAGE_SEKUNDEN = 10 * 60;
/**
 * Alle Geräte im ELW teilen sich meist eine öffentliche IP (Router, Hotspot). Host und
 * jedes wartende Gerät fragen alle 2 s nach (je 30 Aufrufe pro Minute): Die Grenze muss
 * ein gutes Dutzend Geräte gleichzeitig tragen, auch wenn nach einem WLAN-Abriss alle
 * zugleich neu verbinden.
 */
const MAX_AUFRUFE_PRO_MINUTE = 600;
/** Beitrittsanfragen pro IP und Minute; erschwert das Durchprobieren von Kurzcodes. */
const MAX_ANFRAGEN_PRO_MINUTE = 30;
const MAX_CODE_LAENGE = 4_000;

/** Kurzcode, wie der Dienst ihn vergibt: sechs Ziffern. */
export const kurzcodeSchema = z.string().regex(/^\d{6}$/);
const geheim = z.string().regex(/^[0-9a-f-]{36}$/);
const code = z.string().min(10).max(MAX_CODE_LAENGE);

const eingabeSchema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("sitzung") }),
  z.object({ aktion: z.literal("abholen"), kurzcode: kurzcodeSchema, schluessel: geheim }),
  z.object({ aktion: z.literal("antworten"), kurzcode: kurzcodeSchema, schluessel: geheim, anfrageId: geheim, antwort: code.nullable() }),
  z.object({ aktion: z.literal("beenden"), kurzcode: kurzcodeSchema, schluessel: geheim }),
  z.object({ aktion: z.literal("anfrage"), kurzcode: kurzcodeSchema, anfrage: code }),
  z.object({ aktion: z.literal("antwort"), anfrageId: geheim }),
]);

interface AnfrageStatus {
  kurzcode: string;
  status: "wartet" | "abgelehnt" | "zugelassen";
  antwort?: string;
}

export interface Ergebnis {
  status: number;
  inhalt: Record<string, unknown>;
}

const fehler = (status: number, text: string): Ergebnis => ({ status, inhalt: { fehler: text } });
const k = {
  sitzung: (c: string) => `lk:s:${c}`,
  anfragen: (c: string) => `lk:q:${c}`,
  anfrage: (id: string) => `lk:a:${id}`,
  begrenzung: (ip: string) => `lk:r:${ip}`,
  anfrageBegrenzung: (ip: string) => `lk:ra:${ip}`,
};

function neuerKurzcode(): string {
  const zahl = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(zahl).padStart(6, "0");
}

export async function vermitteln(speicher: Speicher, roh: unknown, ip: string): Promise<Ergebnis> {
  if ((await speicher.zaehlen(k.begrenzung(ip), 60)) > MAX_AUFRUFE_PRO_MINUTE) {
    return fehler(429, "Zu viele Anfragen. Bitte kurz warten.");
  }
  const geprueft = eingabeSchema.safeParse(roh);
  if (!geprueft.success) return fehler(400, "Ungültige Anfrage.");
  const e = geprueft.data;

  const hostPruefen = async (c: string, schluessel: string) => (await speicher.lesen(k.sitzung(c))) === schluessel;

  switch (e.aktion) {
    case "sitzung": {
      const schluessel = crypto.randomUUID();
      for (let versuch = 0; versuch < 10; versuch++) {
        const c = neuerKurzcode();
        if (await speicher.setzenWennFrei(k.sitzung(c), schluessel, SITZUNG_SEKUNDEN)) {
          return { status: 200, inhalt: { kurzcode: c, schluessel } };
        }
      }
      return fehler(503, "Kein freier Kurzcode. Bitte erneut versuchen.");
    }
    case "anfrage": {
      if ((await speicher.zaehlen(k.anfrageBegrenzung(ip), 60)) > MAX_ANFRAGEN_PRO_MINUTE) {
        return fehler(429, "Zu viele Beitrittsanfragen. Bitte kurz warten.");
      }
      if (!(await speicher.lesen(k.sitzung(e.kurzcode)))) {
        return fehler(404, "Kurzcode unbekannt oder abgelaufen. Bitte beim Host nachsehen.");
      }
      const anfrageId = crypto.randomUUID();
      const status: AnfrageStatus = { kurzcode: e.kurzcode, status: "wartet" };
      await speicher.setzen(k.anfrage(anfrageId), JSON.stringify(status), ANFRAGE_SEKUNDEN);
      await speicher.anhaengen(k.anfragen(e.kurzcode), JSON.stringify({ anfrageId, anfrage: e.anfrage }), ANFRAGE_SEKUNDEN);
      return { status: 200, inhalt: { anfrageId } };
    }
    case "abholen": {
      if (!(await hostPruefen(e.kurzcode, e.schluessel))) return fehler(403, "Sitzung unbekannt.");
      const anfragen = (await speicher.allesNehmen(k.anfragen(e.kurzcode))).map((t) => JSON.parse(t));
      return { status: 200, inhalt: { anfragen } };
    }
    case "antworten": {
      if (!(await hostPruefen(e.kurzcode, e.schluessel))) return fehler(403, "Sitzung unbekannt.");
      const alt = await speicher.lesen(k.anfrage(e.anfrageId));
      const status = alt ? (JSON.parse(alt) as AnfrageStatus) : null;
      if (!status || status.kurzcode !== e.kurzcode) return fehler(404, "Anfrage unbekannt oder abgelaufen.");
      const neu: AnfrageStatus = e.antwort
        ? { kurzcode: e.kurzcode, status: "zugelassen", antwort: e.antwort }
        : { kurzcode: e.kurzcode, status: "abgelehnt" };
      await speicher.setzen(k.anfrage(e.anfrageId), JSON.stringify(neu), ANFRAGE_SEKUNDEN);
      return { status: 200, inhalt: {} };
    }
    case "antwort": {
      const gespeichert = await speicher.lesen(k.anfrage(e.anfrageId));
      if (!gespeichert) return fehler(404, "Anfrage unbekannt oder abgelaufen.");
      const { status, antwort } = JSON.parse(gespeichert) as AnfrageStatus;
      if (status !== "wartet") await speicher.loeschen(k.anfrage(e.anfrageId));
      return { status: 200, inhalt: antwort ? { status, antwort } : { status } };
    }
    case "beenden": {
      if (await hostPruefen(e.kurzcode, e.schluessel)) {
        await speicher.loeschen(k.sitzung(e.kurzcode), k.anfragen(e.kurzcode));
      }
      return { status: 200, inhalt: {} };
    }
  }
}

type Befehl = (string | number)[];

/**
 * Speicher über Redis-Befehle. Die Quelle führt einen Befehl oder mehrere als
 * Transaktion (MULTI/EXEC) aus; so teilen sich Upstash (REST) und ein eigenes
 * Redis oder Valkey (TCP, siehe server/vermittlung.ts) dieselbe Umsetzung.
 */
export function redisSpeicher(quelle: {
  befehl<T>(befehl: Befehl): Promise<T>;
  transaktion(befehle: Befehl[]): Promise<unknown[]>;
}): Speicher {
  const befehl = <T>(...args: Befehl) => quelle.befehl<T>(args);
  return {
    setzenWennFrei: async (s, w, sek) => (await befehl<string | null>("SET", s, w, "NX", "EX", sek)) === "OK",
    lesen: (s) => befehl<string | null>("GET", s),
    setzen: async (s, w, sek) => {
      await befehl("SET", s, w, "EX", sek);
    },
    loeschen: async (...s) => {
      if (s.length) await befehl("DEL", ...s);
    },
    anhaengen: async (s, w, sek) => {
      await quelle.transaktion([
        ["RPUSH", s, w],
        ["EXPIRE", s, sek],
      ]);
    },
    allesNehmen: async (s) => {
      const [liste] = await quelle.transaktion([
        ["LRANGE", s, 0, -1],
        ["DEL", s],
      ]);
      return (liste as string[] | null) ?? [];
    },
    zaehlen: async (s, sek) => {
      const [n] = await quelle.transaktion([
        ["INCR", s],
        ["EXPIRE", s, sek, "NX"],
      ]);
      return Number(n);
    },
  };
}

/** Speicher über die REST-Schnittstelle von Upstash Redis. */
export function upstashSpeicher(url: string, token: string): Speicher {
  async function ausfuehren<T>(pfad: string, befehle: unknown): Promise<T> {
    const antwort = await fetch(`${url.replace(/\/$/, "")}${pfad}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(befehle),
    });
    if (!antwort.ok) throw new Error(`Upstash ${antwort.status}`);
    return (await antwort.json()) as T;
  }
  return redisSpeicher({
    befehl: async <T>(b: Befehl) => (await ausfuehren<{ result: T }>("", b)).result,
    transaktion: async (befehle) => (await ausfuehren<{ result: unknown }[]>("/multi-exec", befehle)).map((r) => r.result),
  });
}

/**
 * Einfacher Schlüsselspeicher mit synchronem Zugriff, wie ihn ein Durable Object
 * von Cloudflare bietet (`ctx.storage.kv`). Ablaufzeiten stehen im Wert.
 */
export interface SchluesselSpeicher {
  get(schluessel: string): unknown;
  put(schluessel: string, wert: unknown): void;
  delete(schluessel: string): boolean;
  list(optionen: { prefix: string }): Iterable<[string, unknown]>;
}

interface Eintrag {
  wert: string | string[];
  /** Ablauf in Millisekunden seit 1970. */
  bis: number;
}

/**
 * Speicher auf einem Schlüsselspeicher (Cloudflare Durable Object). Ein Durable
 * Object bearbeitet Aufrufe nacheinander, „nur wenn frei“ ist daher ohne Sperre sicher.
 * Zähler für die Begrenzung bleiben im Arbeitsspeicher: Sie müssen keinen Neustart
 * überstehen und kosten so keine Schreibvorgänge.
 */
export function schluesselSpeicher(kv: SchluesselSpeicher, jetzt: () => number = Date.now): Speicher {
  const zaehler = new Map<string, { n: number; bis: number }>();
  const lesen = (s: string): Eintrag | null => {
    const e = kv.get(s) as Eintrag | undefined;
    if (!e) return null;
    if (e.bis <= jetzt()) {
      kv.delete(s);
      return null;
    }
    return e;
  };
  const schreiben = (s: string, wert: Eintrag["wert"], sek: number) => kv.put(s, { wert, bis: jetzt() + sek * 1000 });
  return {
    setzenWennFrei: async (s, w, sek) => {
      if (lesen(s)) return false;
      schreiben(s, w, sek);
      return true;
    },
    lesen: async (s) => {
      const e = lesen(s);
      return typeof e?.wert === "string" ? e.wert : null;
    },
    setzen: async (s, w, sek) => schreiben(s, w, sek),
    loeschen: async (...s) => s.forEach((x) => kv.delete(x)),
    anhaengen: async (s, w, sek) => {
      const alt = lesen(s)?.wert;
      schreiben(s, [...(Array.isArray(alt) ? alt : []), w], sek);
    },
    allesNehmen: async (s) => {
      const e = lesen(s);
      if (!e) return [];
      kv.delete(s);
      return Array.isArray(e.wert) ? e.wert : [];
    },
    zaehlen: async (s, sek) => {
      const t = jetzt();
      if (zaehler.size > 10_000) for (const [x, z] of zaehler) if (z.bis <= t) zaehler.delete(x);
      const alt = zaehler.get(s);
      const neu = alt && alt.bis > t ? { n: alt.n + 1, bis: alt.bis } : { n: 1, bis: t + sek * 1000 };
      zaehler.set(s, neu);
      return neu.n;
    },
  };
}

/** Löscht abgelaufene Einträge eines Schlüsselspeichers; gibt die Zahl der übrigen zurück. */
export function abgelaufeneLoeschen(kv: SchluesselSpeicher, jetzt = Date.now()): number {
  let uebrig = 0;
  for (const [s, e] of kv.list({ prefix: "lk:" })) {
    if ((e as Eintrag).bis <= jetzt) kv.delete(s);
    else uebrig++;
  }
  return uebrig;
}

/** Speicher im Arbeitsspeicher, für Tests. */
export function speicherImArbeitsspeicher(): Speicher {
  const werte = new Map<string, string>();
  const listen = new Map<string, string[]>();
  return {
    setzenWennFrei: async (s, w) => (werte.has(s) ? false : (werte.set(s, w), true)),
    lesen: async (s) => werte.get(s) ?? null,
    setzen: async (s, w) => void werte.set(s, w),
    loeschen: async (...s) => s.forEach((x) => (werte.delete(x), listen.delete(x))),
    anhaengen: async (s, w) => void listen.set(s, [...(listen.get(s) ?? []), w]),
    allesNehmen: async (s) => {
      const l = listen.get(s) ?? [];
      listen.delete(s);
      return l;
    },
    zaehlen: async (s) => {
      const n = Number(werte.get(s) ?? 0) + 1;
      werte.set(s, String(n));
      return n;
    },
  };
}
