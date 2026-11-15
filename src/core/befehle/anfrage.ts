"use client";

import { useEffect, useRef } from "react";

/**
 * Aufträge der Befehlspalette an Seiten, die erst noch geladen werden: z. B.
 * „Tagebuch-Eintrag schreiben“ wechselt zum Tagebuch und setzt dort den Cursor
 * ins Eingabefeld. Der Auftrag bleibt liegen, bis die Seite ihn abholt.
 */
export type Anfrage = "tagebuch-eintrag" | "einsatz-neu" | "einsatz-bearbeiten";

let offen: Anfrage | null = null;
const zuhoerer = new Set<(a: Anfrage) => void>();

/** Auftrag stellen. Ist die Zielseite schon offen, reagiert sie sofort. */
export function anfrageStellen(anfrage: Anfrage): void {
  offen = anfrage;
  zuhoerer.forEach((f) => f(anfrage));
}

/** Liegt der Auftrag an? Ohne ihn abzuholen (für den Anfangszustand einer Komponente). */
export function anfrageOffen(anfrage: Anfrage): boolean {
  return offen === anfrage;
}

/**
 * Führt `ausfuehren` aus, sobald der Auftrag anliegt: beim Einblenden der
 * Komponente oder später, solange sie sichtbar ist. `aktiv` = false überspringt
 * (z. B. für alle Einsätze außer dem ausgewählten).
 */
export function useAnfrage(anfrage: Anfrage, ausfuehren: () => void, aktiv = true): void {
  const aktuell = useRef(ausfuehren);
  useEffect(() => {
    aktuell.current = ausfuehren;
  });

  useEffect(() => {
    if (!aktiv) return;
    const abholen = () => {
      if (offen !== anfrage) return;
      offen = null;
      // Erst nach dem Zeichnen, damit Felder, die jetzt aufgehen, schon im DOM sind.
      requestAnimationFrame(() => aktuell.current());
    };
    abholen();
    zuhoerer.add(abholen);
    return () => {
      zuhoerer.delete(abholen);
    };
  }, [anfrage, aktiv]);
}
