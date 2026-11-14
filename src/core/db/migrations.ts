import type { Transaction } from "dexie";

/**
 * Schema-Versionen der lokalen Datenbank.
 *
 * Regeln:
 * - Einträge werden nie geändert oder entfernt, nur angehängt.
 * - Jede neue Version listet alle Tabellen, deren Indizes sich ändern
 *   (Dexie übernimmt nicht genannte Tabellen unverändert).
 * - Datenumbauten gehören in `upgrade` und müssen ohne Netz laufen.
 * - Tool-Module bringen ihre Tabellen über eine eigene Version hier ein.
 */
export interface Migration {
  version: number;
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => Promise<void> | void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    stores: {
      // Primärschlüssel `id` (UUID), Indizes für Liste und Filter.
      einsaetze: "id, status, beginn",
    },
  },
];
