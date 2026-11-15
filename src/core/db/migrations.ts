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
 * - `beschreibung` sagt in einem Satz für Einsatzkräfte, was beim Update mit
 *   den gespeicherten Daten passiert. Die App zeigt ihn vor dem Update an.
 */
export interface Migration {
  version: number;
  beschreibung: string;
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => Promise<void> | void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    beschreibung: "Neue Tabelle für Einsätze. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Primärschlüssel `id` (UUID), Indizes für Liste und Filter.
      einsaetze: "id, status, beginn",
    },
  },
  {
    version: 2,
    beschreibung: "Neue Tabelle für Geräteeinstellungen, z. B. den aktiven Einsatz. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Geräteeinstellungen als Schlüssel-Wert-Paare, z. B. der aktive Einsatz.
      einstellungen: "schluessel",
    },
  },
  {
    version: 3,
    beschreibung: "Neue Tabellen für das Tool Strahlenexposition. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Tool Strahlenexposition (src/tools/strahlenexposition).
      dosisPersonen: "id, einsatzId",
      dosisAufenthalte: "id, einsatzId, personId",
    },
  },
  {
    version: 4,
    beschreibung: "Neue Tabelle für das Einsatztagebuch. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Tool Einsatztagebuch (src/tools/einsatztagebuch). Einträge werden nie geändert.
      tagebuchEintraege: "id, einsatzId, [einsatzId+nr]",
    },
  },
  {
    version: 5,
    beschreibung: "Neue Tabelle für den Suchverlauf der externen Tools. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Tool Externe Tools (src/tools/recherche): Suchverlauf je Einsatz.
      rechercheSuchen: "id, einsatzId",
    },
  },
  {
    version: 6,
    beschreibung: "Neue Tabelle für verknüpfte Ordner auf diesem Gerät, z. B. Drohnenaufnahmen. Vorhandene Daten bleiben unverändert.",
    stores: {
      // Verknüpfte Ordner je Einsatz (src/core/dateien). Nur auf diesem Gerät, nicht in Sicherung oder Sitzung.
      ordner: "id, einsatzId",
    },
  },
];

/** Neueste Schema-Version, die dieser Build mitbringt. */
export const SCHEMA_VERSION = Math.max(...migrations.map((m) => m.version));
