import { z } from "zod";
import "@/lib/formular";
import { uhrzeitAnwenden } from "./logic";
import { eintragArtSchema, eintragSchema } from "./schema";

/**
 * Schnellerfassung im Einsatztagebuch. Art, Inhalt und Texte prüfen dieselben Regeln
 * wie ein gespeicherter Eintrag; die Uhrzeit ist leer („jetzt“) oder `HH:MM`.
 */
export const eintragFormularSchema = z.object({
  art: eintragArtSchema,
  inhalt: eintragSchema.shape.inhalt,
  von: z.string().trim(),
  an: z.string().trim(),
  verfasser: z.string().trim(),
  uhrzeit: z
    .string()
    .trim()
    .refine((text) => text === "" || uhrzeitAnwenden(new Date(), text) !== null, "Uhrzeit bitte als HH:MM eingeben oder leer lassen."),
});

export type EintragFormularWerte = z.input<typeof eintragFormularSchema>;
