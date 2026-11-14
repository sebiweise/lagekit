import { z } from "zod";
import type { LagekitDB } from "@/core/db/db";
import { aenderungSchema, type Aenderung } from "./protokoll";

/**
 * Dauerhafte Angaben zur Sitzung in den Geräteeinstellungen, damit eine Sitzung
 * ein Neuladen der Seite übersteht. Diese Einträge werden nie abgeglichen.
 */

const HOST = "sync.host";
const GAST = "sync.gast";
const AUSSTEHEND = "sync.ausstehend";

const hostSchema = z.object({
  einsatzId: z.uuid(),
  kurzcode: z.string().nullable(),
  schluessel: z.string().nullable(),
  /** Geräte, die der Host schon zugelassen hat; sie kommen ohne erneute Freigabe wieder rein. */
  bekannt: z.array(z.uuid()),
});
export type HostAblage = z.infer<typeof hostSchema>;

const gastSchema = z.object({
  weg: z.enum(["kurzcode", "qr"]),
  kurzcode: z.string().nullable(),
  /** Bekannt, sobald der Stand des Hosts übernommen wurde. */
  einsatzId: z.uuid().nullable(),
});
export type GastAblage = z.infer<typeof gastSchema>;

const ausstehendSchema = z.object({ einsatzId: z.uuid(), liste: z.array(aenderungSchema) });
export type Ausstehend = z.infer<typeof ausstehendSchema>;

async function lesen<T>(db: LagekitDB, schluessel: string, schema: z.ZodType<T>): Promise<T | null> {
  const r = schema.safeParse((await db.einstellungen.get(schluessel))?.wert);
  return r.success ? r.data : null;
}

async function schreiben(db: LagekitDB, schluessel: string, wert: unknown | null) {
  if (wert === null) await db.einstellungen.delete(schluessel);
  else await db.einstellungen.put({ schluessel, wert });
}

export const ablage = {
  hostLesen: (db: LagekitDB) => lesen(db, HOST, hostSchema),
  hostSchreiben: (db: LagekitDB, wert: HostAblage | null) => schreiben(db, HOST, wert),
  gastLesen: (db: LagekitDB) => lesen(db, GAST, gastSchema),
  gastSchreiben: (db: LagekitDB, wert: GastAblage | null) => schreiben(db, GAST, wert),
  ausstehendLesen: (db: LagekitDB) => lesen(db, AUSSTEHEND, ausstehendSchema),
  /** Hängt Änderungen an, die (noch) nicht beim Host angekommen sind. */
  async ausstehendAnhaengen(db: LagekitDB, einsatzId: string, liste: Aenderung[]) {
    await db.transaction("rw", db.einstellungen, async () => {
      const alt = await lesen(db, AUSSTEHEND, ausstehendSchema);
      const bisher = alt?.einsatzId === einsatzId ? alt.liste : [];
      await schreiben(db, AUSSTEHEND, { einsatzId, liste: [...bisher, ...liste] });
    });
  },
  /** Entfernt die ersten `anzahl` Einträge (die gesendeten). */
  async ausstehendKuerzen(db: LagekitDB, anzahl: number) {
    await db.transaction("rw", db.einstellungen, async () => {
      const alt = await lesen(db, AUSSTEHEND, ausstehendSchema);
      if (!alt) return;
      const rest = alt.liste.slice(anzahl);
      await schreiben(db, AUSSTEHEND, rest.length ? { ...alt, liste: rest } : null);
    });
  },
};
