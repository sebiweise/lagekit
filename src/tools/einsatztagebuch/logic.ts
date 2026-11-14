/**
 * Reine Funktionen des Einsatztagebuchs: Nummerierung, Zeitkorrektur,
 * Korrekturkette, Filter. Ohne UI und ohne Datenbank, voll getestet.
 */
import type { Eintrag, EintragArt } from "./schema";

/** Nächste laufende Nummer nach den vorhandenen Einträgen eines Einsatzes. */
export function naechsteNummer(eintraege: Pick<Eintrag, "nr">[]): number {
  return eintraege.reduce((max, e) => Math.max(max, e.nr), 0) + 1;
}

/**
 * Setzt eine von Hand eingegebene Uhrzeit (`HH:MM`, auch `HHMM` oder `H:MM`)
 * auf den heutigen Tag. Liegt das Ergebnis mehr als 5 Minuten in der Zukunft,
 * ist der Vortag gemeint (Eintrag nach Mitternacht für ein Ereignis davor).
 * Gibt `null` bei ungültiger Eingabe zurück.
 */
export function uhrzeitAnwenden(jetzt: Date, eingabe: string): Date | null {
  const treffer = /^\s*(\d{1,2})[:.]?(\d{2})\s*$/.exec(eingabe);
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return null;
  const ergebnis = new Date(jetzt);
  ergebnis.setHours(stunden, minuten, 0, 0);
  if (ergebnis.getTime() - jetzt.getTime() > 5 * 60_000) ergebnis.setDate(ergebnis.getDate() - 1);
  return ergebnis;
}

/** Zu jedem korrigierten Eintrag der Eintrag, der ihn korrigiert (der neueste, falls mehrere). */
export function korrekturen(eintraege: Eintrag[]): Map<string, Eintrag> {
  const ergebnis = new Map<string, Eintrag>();
  for (const e of [...eintraege].sort((a, b) => a.nr - b.nr)) {
    if (e.korrigiertEintragId) ergebnis.set(e.korrigiertEintragId, e);
  }
  return ergebnis;
}

export interface Filter {
  /** Leere Menge heißt: alle Arten. */
  arten: ReadonlySet<EintragArt>;
  suche: string;
}

/** Filtert nach Art und Volltext (Inhalt, von, an, Verfasser, Nummer), ohne Groß/Klein. */
export function filtern(eintraege: Eintrag[], filter: Filter): Eintrag[] {
  const woerter = filter.suche.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  return eintraege.filter((e) => {
    if (filter.arten.size > 0 && !filter.arten.has(e.art)) return false;
    if (woerter.length === 0) return true;
    const text = [e.inhalt, e.von, e.an, e.verfasser, String(e.nr)].join(" ").toLocaleLowerCase("de");
    return woerter.every((w) => text.includes(w));
  });
}

/** Chronologisch nach Ereigniszeit, bei Gleichstand nach Nummer. */
export function chronologisch(eintraege: Eintrag[]): Eintrag[] {
  return [...eintraege].sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt) || a.nr - b.nr);
}
