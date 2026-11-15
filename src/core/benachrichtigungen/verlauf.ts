/**
 * Benachrichtigungen in der App: ein kurzer Verlauf je Tab (überlebt das
 * Neuladen über sessionStorage) und die Einblendung unten rechts.
 * Alles bleibt auf dem Gerät; es gibt keine Push-Nachrichten über einen Server.
 */

export const ARTEN = ["tagebuch", "dateien", "update", "sitzung"] as const;
export type BenachrichtigungArt = (typeof ARTEN)[number];

export interface Benachrichtigung {
  id: string;
  art: BenachrichtigungArt;
  titel: string;
  text?: string;
  /** Ziel in der App, z. B. „/tools/dateien/“. */
  href?: string;
  /** Beschriftung des Links, z. B. „Ansehen“. */
  linkText?: string;
  /** ISO-Zeitpunkt. */
  zeit: string;
  gelesen: boolean;
}

export type BenachrichtigungEingabe = Omit<Benachrichtigung, "id" | "zeit" | "gelesen"> & {
  /**
   * Gleiche Kennung ersetzt einen älteren Eintrag (z. B. dieselbe neue Version),
   * statt einen zweiten anzulegen.
   */
  kennung?: string;
  /** Wichtig: wird von Screenreadern sofort vorgelesen und bleibt länger stehen. */
  wichtig?: boolean;
};

export interface Einstellungen {
  /** Einblenden am Bildschirmrand; der Verlauf an der Glocke füllt sich immer. */
  einblenden: boolean;
}

export const MAX_VERLAUF = 50;
const VERLAUF_SCHLUESSEL = "lagekit.benachrichtigungen";
const EINSTELLUNG_SCHLUESSEL = "lagekit.benachrichtigungen.einstellungen";
const STANDARD: Einstellungen = { einblenden: true };

/** Zeigt eine Benachrichtigung an; wird von der Oberfläche gesetzt. */
export type Anzeige = (b: Benachrichtigung, wichtig: boolean) => void;

let verlauf: readonly Benachrichtigung[] = verlaufLaden();
let einstellungen: Einstellungen = einstellungenLaden();
let anzeige: Anzeige | null = null;
const hoerer = new Set<() => void>();

function speicher(art: "session" | "local"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return art === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function verlaufLaden(): Benachrichtigung[] {
  try {
    const roh = speicher("session")?.getItem(VERLAUF_SCHLUESSEL);
    const liste: unknown = roh ? JSON.parse(roh) : [];
    return Array.isArray(liste) ? (liste as Benachrichtigung[]).slice(0, MAX_VERLAUF) : [];
  } catch {
    return [];
  }
}

function einstellungenLaden(): Einstellungen {
  try {
    const roh = speicher("local")?.getItem(EINSTELLUNG_SCHLUESSEL);
    return roh ? { ...STANDARD, ...(JSON.parse(roh) as Partial<Einstellungen>) } : STANDARD;
  } catch {
    return STANDARD;
  }
}

function geaendert() {
  try {
    speicher("session")?.setItem(VERLAUF_SCHLUESSEL, JSON.stringify(verlauf));
  } catch {
    // ohne Speicher nur bis zum Neuladen
  }
  for (const h of hoerer) h();
}

/**
 * Meldet ein Ereignis: immer in den Verlauf, eingeblendet nur, wenn das auf
 * diesem Gerät eingeschaltet ist und der Tab sichtbar ist.
 */
export function benachrichtigen(eingabe: BenachrichtigungEingabe, jetzt: Date = new Date()): Benachrichtigung {
  const { kennung, wichtig = false, ...rest } = eingabe;
  const b: Benachrichtigung = {
    ...rest,
    id: kennung ?? crypto.randomUUID(),
    zeit: jetzt.toISOString(),
    gelesen: false,
  };
  verlauf = [b, ...verlauf.filter((v) => v.id !== b.id)].slice(0, MAX_VERLAUF);
  geaendert();
  const sichtbar = typeof document === "undefined" || document.visibilityState !== "hidden";
  if (einstellungen.einblenden && sichtbar) anzeige?.(b, wichtig);
  return b;
}

export function alleGelesen(): void {
  if (verlauf.every((b) => b.gelesen)) return;
  verlauf = verlauf.map((b) => (b.gelesen ? b : { ...b, gelesen: true }));
  geaendert();
}

export function verlaufLeeren(): void {
  verlauf = [];
  geaendert();
}

export function einstellungenSetzen(teil: Partial<Einstellungen>): void {
  einstellungen = { ...einstellungen, ...teil };
  try {
    speicher("local")?.setItem(EINSTELLUNG_SCHLUESSEL, JSON.stringify(einstellungen));
  } catch {
    // nur für diese Sitzung
  }
  for (const h of hoerer) h();
}

export function anzeigeSetzen(a: Anzeige | null): void {
  anzeige = a;
}

export const benachrichtigungen = {
  abonnieren(h: () => void) {
    hoerer.add(h);
    return () => {
      hoerer.delete(h);
    };
  },
  verlauf: () => verlauf,
  einstellungen: () => einstellungen,
};

const LEER: readonly Benachrichtigung[] = [];
export const SERVER_VERLAUF = () => LEER;
export const SERVER_EINSTELLUNGEN = () => STANDARD;

/** Nur für Tests: Zustand zurücksetzen. */
export function _zuruecksetzen(): void {
  verlauf = [];
  einstellungen = STANDARD;
  anzeige = null;
}
