import type { Table } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import { sucheSchema, type Suche } from "./schema";

export const TABELLE_SUCHEN = "rechercheSuchen";

export function suchen(db: LagekitDB): Table<Suche, string> {
  return db.table(TABELLE_SUCHEN);
}

export type SucheEingabe = Omit<Suche, "id" | "zeitpunkt" | "ort"> & { ort?: string };

/** Speichert eine gestartete Suche im Verlauf des Einsatzes. */
export async function sucheSpeichern(db: LagekitDB, eingabe: SucheEingabe, jetzt: Date = new Date()): Promise<Suche> {
  const suche = sucheSchema.parse({ ...eingabe, id: crypto.randomUUID(), zeitpunkt: jetzt.toISOString() });
  await suchen(db).add(suche);
  return suche;
}
