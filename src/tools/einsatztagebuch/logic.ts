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

/**
 * Bereits genutzte Angaben aus „von“ und „an“ als Vorschläge: zuerst die des
 * angegebenen Einsatzes, dann die aus anderen Einsätzen, jeweils zuletzt genutzte
 * zuerst. Gleiche Werte ohne Rücksicht auf Groß/Klein zählen einmal, in der
 * zuletzt genutzten Schreibweise.
 */
export function vonAnVorschlaege(
  eintraege: Pick<Eintrag, "einsatzId" | "erfasstAm" | "nr" | "von" | "an">[],
  einsatzId: string,
): string[] {
  const sortiert = [...eintraege].sort(
    (a, b) =>
      Number(b.einsatzId === einsatzId) - Number(a.einsatzId === einsatzId) ||
      b.erfasstAm.localeCompare(a.erfasstAm) ||
      b.nr - a.nr,
  );
  const gesehen = new Set<string>();
  const ergebnis: string[] = [];
  for (const e of sortiert) {
    for (const wert of [e.von, e.an]) {
      const text = wert.trim();
      const schluessel = text.toLocaleLowerCase("de");
      if (!text || gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      ergebnis.push(text);
    }
  }
  return ergebnis;
}

/**
 * Vorschläge zur Eingabe, ohne Groß/Klein: erst die, die mit der Eingabe beginnen,
 * dann die, bei denen ein späteres Wort so beginnt, dann alle, die sie enthalten.
 * Der eingegebene Wert selbst wird nicht vorgeschlagen. Leere Eingabe liefert alle.
 */
export function vorschlaegeFiltern(vorschlaege: string[], eingabe: string, hoechstens = 6): string[] {
  const suche = eingabe.trim().toLocaleLowerCase("de");
  if (!suche) return vorschlaege.slice(0, hoechstens);
  const anfang: string[] = [];
  const wortanfang: string[] = [];
  const enthalten: string[] = [];
  for (const v of vorschlaege) {
    const klein = v.toLocaleLowerCase("de");
    if (klein === suche) continue;
    if (klein.startsWith(suche)) anfang.push(v);
    else if (klein.split(/[\s/,.\-()]+/).some((wort) => wort.startsWith(suche))) wortanfang.push(v);
    else if (klein.includes(suche)) enthalten.push(v);
  }
  return [...anfang, ...wortanfang, ...enthalten].slice(0, hoechstens);
}

/**
 * Inline-Ergänzung: der erste Vorschlag, der mit der Eingabe beginnt (ohne Groß/Klein),
 * sonst `null`. Leerzeichen am Ende der Eingabe zählen mit, damit „ELW “ zu „ELW 1“ passt.
 */
export function ergaenzungFinden(vorschlaege: string[], eingabe: string): string | null {
  if (!eingabe.trim()) return null;
  const suche = eingabe.toLocaleLowerCase("de");
  return vorschlaege.find((v) => v.length > eingabe.length && v.toLocaleLowerCase("de").startsWith(suche)) ?? null;
}
