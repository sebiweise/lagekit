import { z } from "zod";

export const EINTRAG_ARTEN = ["Meldung", "Befehl", "Lage", "Maßnahme", "Notiz"] as const;
export const eintragArtSchema = z.enum(EINTRAG_ARTEN);
export type EintragArt = z.infer<typeof eintragArtSchema>;

const zeitpunkt = z.iso.datetime({ offset: true });

/**
 * Ein Tagebucheintrag. Einträge werden nie geändert oder gelöscht.
 * Eine Korrektur ist ein neuer Eintrag, der in `korrigiertEintragId` auf den
 * alten verweist; der alte gilt dadurch als korrigiert.
 */
export const eintragSchema = z.object({
  id: z.uuid(),
  einsatzId: z.uuid(),
  /** Laufende Nummer je Einsatz, ab 1. */
  nr: z.number().int().positive(),
  /** Zeitpunkt des Ereignisses (bei Erfassung korrigierbar). */
  zeitpunkt,
  /** Zeitpunkt der Erfassung, immer die Gerätezeit beim Speichern. */
  erfasstAm: zeitpunkt,
  art: eintragArtSchema,
  von: z.string().trim().default(""),
  an: z.string().trim().default(""),
  inhalt: z.string().trim().min(1, "Inhalt fehlt"),
  verfasser: z.string().trim().default(""),
  korrigiertEintragId: z.uuid().nullable(),
});
export type Eintrag = z.infer<typeof eintragSchema>;
