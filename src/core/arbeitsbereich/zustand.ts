/**
 * Zustand des Arbeitsbereichs: welche Tools als Tabs offen sind und was wo angezeigt wird.
 * Reine Funktionen, damit sie ohne Browser testbar sind.
 */
export type Seite = "links" | "rechts";

export interface Arbeitsbereich {
  /** Offene Tabs in Reihenfolge. */
  offen: string[];
  links: string | null;
  /** Nur bei geteilter Ansicht. */
  rechts: string | null;
  geteilt: boolean;
  /** Welche Seite ein Tipp auf einen Tab füllt. */
  fokus: Seite;
}

export const LEER: Arbeitsbereich = { offen: [], links: null, rechts: null, geteilt: false, fokus: "links" };

/** Prüft gespeicherte Daten und verwirft unbekannte Tools. */
export function bereinigen(roh: unknown, bekannt: string[]): Arbeitsbereich {
  if (typeof roh !== "object" || roh === null) return LEER;
  const r = roh as Partial<Arbeitsbereich>;
  const offen = Array.isArray(r.offen) ? [...new Set(r.offen.filter((id) => bekannt.includes(id)))] : [];
  const gueltig = (id: unknown) => (typeof id === "string" && offen.includes(id) ? id : null);
  const links = gueltig(r.links) ?? offen[0] ?? null;
  const rechtsRoh = gueltig(r.rechts);
  const rechts = rechtsRoh !== links ? rechtsRoh : null;
  return {
    offen,
    links,
    rechts,
    geteilt: r.geteilt === true,
    fokus: r.fokus === "rechts" && r.geteilt === true ? "rechts" : "links",
  };
}

/** Zeigt ein Tool auf der Seite mit Fokus; öffnet es als Tab, falls nötig. Steht es schon auf der anderen Seite, tauschen die Seiten. */
export function zeigen(z: Arbeitsbereich, id: string): Arbeitsbereich {
  const offen = z.offen.includes(id) ? z.offen : [...z.offen, id];
  if (!z.geteilt || z.fokus === "links") {
    if (z.geteilt && z.rechts === id) return { ...z, offen, links: id, rechts: z.links };
    return { ...z, offen, links: id };
  }
  if (z.links === id) return { ...z, offen, rechts: id, links: z.rechts ?? frei(offen, id) };
  return { ...z, offen, rechts: id };
}

function frei(offen: string[], ausser: string): string | null {
  return offen.find((o) => o !== ausser) ?? null;
}

/** Schließt einen Tab; die betroffene Seite zeigt dann einen anderen offenen Tab. */
export function schliessen(z: Arbeitsbereich, id: string): Arbeitsbereich {
  const offen = z.offen.filter((o) => o !== id);
  const rest = (andere: string | null) => offen.find((o) => o !== andere) ?? null;
  let links = z.links === id ? rest(z.rechts) : z.links;
  let rechts = z.rechts === id ? rest(links) : z.rechts;
  if (!links && rechts) [links, rechts] = [rechts, null];
  return { ...z, offen, links, rechts };
}

/** Schaltet die geteilte Ansicht um; rechts erscheint der nächste offene Tab. */
export function teilen(z: Arbeitsbereich, an: boolean): Arbeitsbereich {
  if (!an) return { ...z, geteilt: false, fokus: "links" };
  const rechts = z.rechts && z.rechts !== z.links ? z.rechts : (z.offen.find((o) => o !== z.links) ?? null);
  return { ...z, geteilt: true, rechts, fokus: rechts ? "links" : "rechts" };
}
