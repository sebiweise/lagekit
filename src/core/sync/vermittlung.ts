/**
 * Client für den Vermittlungsdienst (Kurzcode-Weg).
 *
 * Über den Dienst laufen nur Beitrittsanfrage und Antwort, also die
 * Verbindungsdaten. Die Einsatzdaten gehen danach direkt von Gerät zu Gerät.
 * Welcher Dienst das ist, legt die Installation fest (siehe dienst-adresse.ts).
 */

import { kurzcodeDienst } from "./dienst-konfiguration";

export class VermittlungFehler extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "VermittlungFehler";
  }
}

async function aufrufen<T>(daten: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const dienst = await kurzcodeDienst();
  if (!dienst) {
    throw new VermittlungFehler("Kurzcode ist in dieser Installation ausgeschaltet. Nutzen Sie den Weg mit QR-Code.");
  }
  let antwort: Response;
  try {
    antwort = await fetch(dienst.endpunkt, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(daten),
      cache: "no-store",
      signal,
    });
  } catch {
    throw new VermittlungFehler("Keine Internetverbindung. Nutzen Sie den Weg mit QR-Code.");
  }
  const inhalt = (await antwort.json().catch(() => ({}))) as T & { fehler?: string };
  if (!antwort.ok) {
    throw new VermittlungFehler(inhalt.fehler ?? "Der Vermittlungsdienst ist nicht erreichbar.", antwort.status);
  }
  return inhalt;
}

/**
 * So lange darf der Dienst mit der Antwort warten, bis etwas Neues da ist (Long-Polling).
 * Dienste, die nicht warten können, antworten sofort; dann fragt die App in Abständen.
 */
export const WARTEN_SEKUNDEN = 25;

/** `gewartet`: Der Dienst hat auf Neues gewartet, die App darf sofort wieder fragen. */
export interface Abgeholt<T> {
  daten: T;
  gewartet: boolean;
}

export type AntwortStatus = { status: "wartet" | "abgelehnt" | "zugelassen"; antwort?: string };

export interface Vermittlung {
  sitzungAnlegen(): Promise<{ kurzcode: string; schluessel: string }>;
  anfragenAbholen(
    kurzcode: string,
    schluessel: string,
    signal?: AbortSignal,
  ): Promise<Abgeholt<{ anfrageId: string; anfrage: string }[]>>;
  antworten(kurzcode: string, schluessel: string, anfrageId: string, antwort: string | null): Promise<void>;
  sitzungBeenden(kurzcode: string, schluessel: string): Promise<void>;
  anfrageSenden(kurzcode: string, anfrage: string): Promise<string>;
  antwortAbholen(anfrageId: string, signal?: AbortSignal): Promise<Abgeholt<AntwortStatus>>;
}

export const vermittlung: Vermittlung = {
  sitzungAnlegen: () => aufrufen({ aktion: "sitzung" }),
  anfragenAbholen: async (kurzcode, schluessel, signal) => {
    const r = await aufrufen<{ anfragen: { anfrageId: string; anfrage: string }[]; gewartet?: boolean }>(
      { aktion: "abholen", kurzcode, schluessel, warten: WARTEN_SEKUNDEN },
      signal,
    );
    return { daten: r.anfragen, gewartet: r.gewartet === true };
  },
  antworten: async (kurzcode, schluessel, anfrageId, antwort) => {
    await aufrufen({ aktion: "antworten", kurzcode, schluessel, anfrageId, antwort });
  },
  sitzungBeenden: async (kurzcode, schluessel) => {
    await aufrufen({ aktion: "beenden", kurzcode, schluessel });
  },
  anfrageSenden: async (kurzcode, anfrage) =>
    (await aufrufen<{ anfrageId: string }>({ aktion: "anfrage", kurzcode, anfrage })).anfrageId,
  antwortAbholen: async (anfrageId, signal) => {
    const { gewartet, ...daten } = await aufrufen<AntwortStatus & { gewartet?: boolean }>(
      { aktion: "antwort", anfrageId, warten: WARTEN_SEKUNDEN },
      signal,
    );
    return { daten, gewartet: gewartet === true };
  },
};

/** Pause, wenn der Dienst nicht gewartet hat: im Vordergrund kurz, im Hintergrund länger. */
const PAUSE_MS = 2_000;
const PAUSE_HINTERGRUND_MS = 10_000;
/** Nach einem Fehler (z. B. kurz kein Netz). */
const PAUSE_FEHLER_MS = 5_000;
/** Untergrenze zwischen zwei Abfragen, falls ein Dienst ständig sofort antwortet. */
const MIN_ABSTAND_MS = 250;

function schlafen(ms: number, signal: AbortSignal) {
  return new Promise<void>((fertig) => {
    const zeit = setTimeout(fertig, ms);
    signal.addEventListener("abort", () => (clearTimeout(zeit), fertig()), { once: true });
  });
}

/**
 * Fragt wiederholt beim Dienst nach, bis `schritt` „fertig“ meldet oder die Rückgabe
 * zum Beenden aufgerufen wird. Hat der Dienst gewartet (Long-Polling), geht es sofort
 * weiter; sonst mit Pause, im Hintergrund-Tab seltener.
 */
export function nachfragen(schritt: (signal: AbortSignal) => Promise<{ gewartet: boolean } | "fertig">): () => void {
  const steuerung = new AbortController();
  const { signal } = steuerung;
  void (async () => {
    while (!signal.aborted) {
      const beginn = Date.now();
      let pause: number;
      try {
        const r = await schritt(signal);
        if (r === "fertig") return;
        pause = r.gewartet ? 0 : document.hidden ? PAUSE_HINTERGRUND_MS : PAUSE_MS;
      } catch {
        pause = PAUSE_FEHLER_MS;
      }
      if (signal.aborted) return;
      await schlafen(Math.max(pause, MIN_ABSTAND_MS - (Date.now() - beginn)), signal);
    }
  })();
  return () => steuerung.abort();
}
