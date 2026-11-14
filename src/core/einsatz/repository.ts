import type { LagekitDB } from "@/core/db/db";
import { einsatzSchema, neuerEinsatzSchema, type Einsatz, type NeuerEinsatz } from "./schema";

/** Legt einen Einsatz an; Eingaben werden mit Zod geprüft. */
export async function einsatzAnlegen(
  db: LagekitDB,
  eingabe: NeuerEinsatz,
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  const daten = neuerEinsatzSchema.parse(eingabe);
  const zeitpunkt = jetzt.toISOString();
  const einsatz = einsatzSchema.parse({
    ...daten,
    id: crypto.randomUUID(),
    beginn: daten.beginn ?? zeitpunkt,
    ende: null,
    status: "aktiv",
    erstelltAm: zeitpunkt,
    geaendertAm: zeitpunkt,
  });
  await db.einsaetze.add(einsatz);
  return einsatz;
}

/** Alle Einsätze, neueste zuerst. */
export async function einsaetzeAuflisten(db: LagekitDB): Promise<Einsatz[]> {
  return db.einsaetze.orderBy("beginn").reverse().toArray();
}
