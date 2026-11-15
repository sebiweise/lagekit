import { formatDatumZeit } from "@/lib/zeit";
import { utmref } from "@/core/standort/utmref";
import type { Einsatz } from "./schema";

function zitat(wert: string): string {
  return wert ? `„${wert}“` : "(leer)";
}

function punkt(k: Einsatz["koordinaten"]): string {
  return k ? `UTMREF ${utmref(k.lat, k.lon)}` : "(kein Punkt)";
}

function gleichePunkte(a: Einsatz["koordinaten"], b: Einsatz["koordinaten"]): boolean {
  if (!a || !b) return a === b;
  return a.lat === b.lat && a.lon === b.lon;
}

/**
 * Beschreibt die Unterschiede in den Stammdaten zweier Stände eines Einsatzes,
 * eine Zeile je geändertem Feld. Leere Liste, wenn sich nichts geändert hat.
 */
export function aenderungenBeschreiben(alt: Einsatz, neu: Einsatz): string[] {
  const zeilen: string[] = [];
  if (alt.stichwort !== neu.stichwort) zeilen.push(`Stichwort: ${zitat(alt.stichwort)} → ${zitat(neu.stichwort)}`);
  if (alt.ort !== neu.ort) zeilen.push(`Ort: ${zitat(alt.ort)} → ${zitat(neu.ort)}`);
  if (!gleichePunkte(alt.koordinaten, neu.koordinaten)) {
    zeilen.push(`Einsatzort-Punkt: ${punkt(alt.koordinaten)} → ${punkt(neu.koordinaten)}`);
  }
  if (alt.einheit !== neu.einheit) zeilen.push(`Eigene Einheit: ${zitat(alt.einheit)} → ${zitat(neu.einheit)}`);
  if (new Date(alt.beginn).getTime() !== new Date(neu.beginn).getTime()) {
    zeilen.push(`Beginn: ${formatDatumZeit(alt.beginn)} → ${formatDatumZeit(neu.beginn)}`);
  }
  return zeilen;
}
