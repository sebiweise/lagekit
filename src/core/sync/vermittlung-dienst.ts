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

/**
 * Wartende Abfragen (Long-Polling): Wer nachfragt und noch nichts bekommt, wartet bis
 * zu {@link MAX_WARTEN_SEKUNDEN}, bis jemand für diesen Schlüssel etwas ablegt. Nur
 * Dienste mit einem einzigen Prozess können das (Durable Object, Node-Server); ohne
 * Warteliste antwortet der Dienst sofort, und die App fragt in Abständen nach.
 */
export interface Warteliste {
  /**
   * Wartet höchstens `ms`, bis {@link Warteliste.wecken} für den Schlüssel kommt.
   * Es wartet immer nur die neueste Abfrage je Schlüssel: Eine neue verdrängt die
   * ältere (`"verdraengt"`). Sonst nähme z. B. die Abfrage eines inzwischen neu
   * geladenen Tabs die Beitrittsanfrage weg, und sie ginge verloren.
   */
  warten(schluessel: string, ms: number): Promise<"geweckt" | "zeit" | "verdraengt">;
  wecken(schluessel: string): void;
}

export const MAX_WARTEN_SEKUNDEN = 25;

/** Warteliste im Arbeitsspeicher eines Prozesses. */
export function warteliste(): Warteliste {
  type Grund = "geweckt" | "zeit" | "verdraengt";
  const wartende = new Map<string, (grund: Grund) => void>();
  return {
    warten: (schluessel, ms) =>
      new Promise<Grund>((fertig) => {
        wartende.get(schluessel)?.("verdraengt");
        const weiter = (grund: Grund) => {
          clearTimeout(zeit);
          if (wartende.get(schluessel) === weiter) wartende.delete(schluessel);
          fertig(grund);
        };
        const zeit = setTimeout(() => weiter("zeit"), ms);
        wartende.set(schluessel, weiter);
      }),
    wecken: (schluessel) => wartende.get(schluessel)?.("geweckt"),
  };
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
/** Wie lange der Aufruf höchstens auf Neues warten darf, in Sekunden. */
const warten = z.number().int().min(0).max(MAX_WARTEN_SEKUNDEN).optional();

const eingabeSchema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("sitzung") }),
  z.object({ aktion: z.literal("abholen"), kurzcode: kurzcodeSchema, schluessel: geheim, warten }),
  z.object({ aktion: z.literal("antworten"), kurzcode: kurzcodeSchema, schluessel: geheim, anfrageId: geheim, antwort: code.nullable() }),
  z.object({ aktion: z.literal("beenden"), kurzcode: kurzcodeSchema, schluessel: geheim }),
  z.object({ aktion: z.literal("anfrage"), kurzcode: kurzcodeSchema, anfrage: code }),
  z.object({ aktion: z.literal("antwort"), anfrageId: geheim, warten }),
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

/**
 * Führt eine Aktion aus. Mit `wartende` warten „abholen“ und „antwort“ auf Wunsch
 * (`warten` in Sekunden), bis etwas da ist; die Antwort enthält dann `gewartet: true`,
 * damit die App sofort wieder fragen kann statt eine Pause einzulegen.
 */
export async function vermitteln(speicher: Speicher, roh: unknown, ip: string, wartende?: Warteliste): Promise<Ergebnis> {
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
      wartende?.wecken(k.anfragen(e.kurzcode));
      return { status: 200, inhalt: { anfrageId } };
    }
    case "abholen": {
      if (!(await hostPruefen(e.kurzcode, e.schluessel))) return fehler(403, "Sitzung unbekannt.");
      let anfragen = await speicher.allesNehmen(k.anfragen(e.kurzcode));
      const lange = Boolean(wartende && e.warten);
      if (!anfragen.length && wartende && e.warten) {
        const grund = await wartende.warten(k.anfragen(e.kurzcode), e.warten * 1000);
        if (grund !== "verdraengt" && (await hostPruefen(e.kurzcode, e.schluessel))) {
          anfragen = await speicher.allesNehmen(k.anfragen(e.kurzcode));
        }
      }
      return { status: 200, inhalt: { anfragen: anfragen.map((t) => JSON.parse(t)), ...(lange && { gewartet: true }) } };
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
      wartende?.wecken(k.anfrage(e.anfrageId));
      return { status: 200, inhalt: {} };
    }
    case "antwort": {
      const lesen = async () => {
        const gespeichert = await speicher.lesen(k.anfrage(e.anfrageId));
        return gespeichert ? (JSON.parse(gespeichert) as AnfrageStatus) : null;
      };
      let gespeichert = await lesen();
      if (!gespeichert) return fehler(404, "Anfrage unbekannt oder abgelaufen.");
      const lange = Boolean(wartende && e.warten);
      if (gespeichert.status === "wartet" && wartende && e.warten) {
        const grund = await wartende.warten(k.anfrage(e.anfrageId), e.warten * 1000);
        // Verdrängt: Eine neuere Abfrage holt die Antwort ab, diese meldet nur „wartet“.
        gespeichert = grund === "verdraengt" ? gespeichert : await lesen();
        if (!gespeichert) return fehler(404, "Anfrage unbekannt oder abgelaufen.");
      }
      const { status, antwort } = gespeichert;
      if (status !== "wartet") await speicher.loeschen(k.anfrage(e.anfrageId));
      const inhalt: Record<string, unknown> = antwort ? { status, antwort } : { status };
      return { status: 200, inhalt: lange ? { ...inhalt, gewartet: true } : inhalt };
    }
    case "beenden": {
      if (await hostPruefen(e.kurzcode, e.schluessel)) {
        await speicher.loeschen(k.sitzung(e.kurzcode), k.anfragen(e.kurzcode));
        wartende?.wecken(k.anfragen(e.kurzcode));
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
