import { z } from "zod";
import { koordinatenSchema } from "@/core/standort/standort";
import { optionalerZeitpunktText } from "@/lib/formular";

/**
 * Ein Einsatz ist die Klammer für alle Tool-Daten.
 * Zeitpunkte werden als ISO-8601-Zeichenketten gespeichert (sortierbar, exportierbar).
 */
export const einsatzStatusSchema = z.enum(["aktiv", "abgeschlossen"]);

export const einsatzSchema = z.object({
  id: z.uuid(),
  stichwort: z.string().trim().min(1, "Bitte ein Stichwort angeben."),
  ort: z.string().trim().default(""),
  /** Einsatzort als Punkt, wenn per Standort oder Karte gesetzt. */
  koordinaten: koordinatenSchema.nullable().default(null),
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
  koordinaten: true,
}).extend({
  beginn: einsatzSchema.shape.beginn.optional(),
});

export type NeuerEinsatz = z.input<typeof neuerEinsatzSchema>;

/** Nachträglich änderbare Stammdaten; fehlende Felder bleiben unverändert. */
export const einsatzAenderungSchema = z.object({
  stichwort: einsatzSchema.shape.stichwort.optional(),
  ort: z.string().trim().optional(),
  einheit: z.string().trim().optional(),
  koordinaten: koordinatenSchema.nullable().optional(),
  beginn: einsatzSchema.shape.beginn.optional(),
});

export type EinsatzAenderung = z.input<typeof einsatzAenderungSchema>;

/**
 * Formular „Einsatz anlegen/bearbeiten“: Felder als Text, wie sie im Formular stehen.
 * Stichwort und Koordinaten prüfen dieselben Regeln wie das Datenmodell.
 * Beginn leer heißt beim Anlegen „jetzt“; beim Bearbeiten ist er Pflicht (siehe `einsatzBearbeitenFormularSchema`).
 */
export const einsatzFormularSchema = z.object({
  stichwort: einsatzSchema.shape.stichwort,
  ort: z.string().trim(),
  einheit: z.string().trim(),
  koordinaten: koordinatenSchema.nullable(),
  beginn: optionalerZeitpunktText(),
});

export const einsatzBearbeitenFormularSchema = einsatzFormularSchema.refine((w) => w.beginn !== undefined, {
  message: "Bitte den Beginn angeben.",
  path: ["beginn"],
});

export type EinsatzFormularWerte = z.input<typeof einsatzFormularSchema>;
