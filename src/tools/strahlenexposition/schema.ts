import { z } from "zod";

export const odlEinheitSchema = z.enum(["µSv/h", "mSv/h", "Sv/h"]);
export type OdlEinheit = z.infer<typeof odlEinheitSchema>;

const zeitpunkt = z.iso.datetime({ offset: true });

/** Eine Einsatzkraft, deren Dosis überwacht wird. */
export const personSchema = z.object({
  id: z.uuid(),
  einsatzId: z.uuid(),
  name: z.string().trim().min(1, "Name fehlt"),
  /** Freitext, z. B. „Angriffstrupp 1“; Personen mit gleichem Trupp werden gemeinsam geführt. */
  trupp: z.string().trim().default(""),
  /** Id des Dosisrichtwerts, gegen den die Ampel prüft. */
  richtwertId: z.string(),
  erstelltAm: zeitpunkt,
});
export type Person = z.infer<typeof personSchema>;

/** Ein Aufenthalt einer Person an einem Ort mit konstanter Ortsdosisleistung. */
export const aufenthaltSchema = z
  .object({
    id: z.uuid(),
    einsatzId: z.uuid(),
    personId: z.uuid(),
    ort: z.string().trim().min(1, "Ort fehlt"),
    beginn: zeitpunkt,
    /** `null`, solange der Aufenthalt läuft. */
    ende: zeitpunkt.nullable(),
    /** Ortsdosisleistung (ODL) als Zahl in `odlEinheit`. */
    odl: z.number().nonnegative("ODL darf nicht negativ sein").finite(),
    odlEinheit: odlEinheitSchema,
    /** Am Dosimeter abgelesene Dosis für diesen Aufenthalt in mSv, falls erfasst. */
    dosimeterMsv: z.number().nonnegative().finite().nullable(),
    erstelltAm: zeitpunkt,
  })
  .refine((a) => a.ende === null || a.ende >= a.beginn, {
    message: "Ende liegt vor dem Beginn",
    path: ["ende"],
  });
export type Aufenthalt = z.infer<typeof aufenthaltSchema>;

/** Dosisrichtwert für die Ampel; einstellbar. */
export const richtwertSchema = z.object({
  id: z.string().min(1),
  bezeichnung: z.string().trim().min(1),
  grenzeMsv: z.number().positive().finite(),
  hinweis: z.string().default(""),
});
export type Richtwert = z.infer<typeof richtwertSchema>;
