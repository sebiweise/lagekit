import { z } from "zod";

/**
 * Ein Einsatz ist die Klammer für alle Tool-Daten.
 * Zeitpunkte werden als ISO-8601-Zeichenketten gespeichert (sortierbar, exportierbar).
 */
export const einsatzStatusSchema = z.enum(["aktiv", "abgeschlossen"]);

export const einsatzSchema = z.object({
  id: z.uuid(),
  stichwort: z.string().trim().min(1, "Stichwort fehlt"),
  ort: z.string().trim().default(""),
  einheit: z.string().trim().default(""),
  beginn: z.iso.datetime({ offset: true }),
  ende: z.iso.datetime({ offset: true }).nullable(),
  status: einsatzStatusSchema,
  erstelltAm: z.iso.datetime({ offset: true }),
  geaendertAm: z.iso.datetime({ offset: true }),
});

export type Einsatz = z.infer<typeof einsatzSchema>;
export type EinsatzStatus = z.infer<typeof einsatzStatusSchema>;

/** Eingaben beim Anlegen; alles Übrige wird gesetzt. */
export const neuerEinsatzSchema = einsatzSchema.pick({
  stichwort: true,
  ort: true,
  einheit: true,
}).extend({
  beginn: einsatzSchema.shape.beginn.optional(),
});

export type NeuerEinsatz = z.input<typeof neuerEinsatzSchema>;
