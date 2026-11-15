import { z } from "zod";
import { optionaleZahlText, pflichtText, zahlText, zeitpunktText } from "@/lib/formular";

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
    dosimeterMsv: z.number().nonnegative("Dosimeterwert darf nicht negativ sein").finite().nullable(),
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
  grenzeMsv: z.number().positive("Richtwert muss größer als 0 sein").finite(),
  hinweis: z.string().default(""),
});
export type Richtwert = z.infer<typeof richtwertSchema>;

// Formulare: Felder als Text, wie sie im Formular stehen. Die Werte laufen danach durch
// dieselben Regeln wie das Datenmodell (z. B. ODL nicht negativ, Ende nicht vor Beginn).

/** ODL-Feld mit Komma oder Punkt. */
export const odlText = zahlText("Bitte die ODL als Zahl eingeben, z. B. 0,5.").pipe(aufenthaltSchema.shape.odl);

/** Dosimeterwert in mSv; leer heißt „nicht abgelesen“. */
export const dosimeterText = optionaleZahlText("Bitte den Dosimeterwert als Zahl eingeben oder leer lassen.").pipe(
  aufenthaltSchema.shape.dosimeterMsv,
);

export const personFormularSchema = z.object({
  name: pflichtText("Bitte einen Namen angeben."),
  trupp: z.string().trim(),
  richtwertId: personSchema.shape.richtwertId,
});
export type PersonFormularWerte = z.input<typeof personFormularSchema>;

export const aufenthaltStartFormularSchema = z.object({
  ort: pflichtText("Bitte den Ort angeben."),
  odl: odlText,
  odlEinheit: odlEinheitSchema,
});
export type AufenthaltStartFormularWerte = z.input<typeof aufenthaltStartFormularSchema>;

export const aufenthaltNachtragenFormularSchema = aufenthaltStartFormularSchema
  .extend({
    beginn: zeitpunktText("Bitte den Beginn angeben."),
    ende: zeitpunktText("Bitte das Ende angeben."),
    dosimeterMsv: dosimeterText,
  })
  .refine((a) => a.ende >= a.beginn, { message: "Ende liegt vor dem Beginn.", path: ["ende"] });
export type AufenthaltNachtragenFormularWerte = z.input<typeof aufenthaltNachtragenFormularSchema>;

export const richtwerteFormularSchema = z.object({
  werte: z.array(
    z.object({
      grenzeMsv: zahlText("Bitte eine Zahl in mSv eingeben, z. B. 20.").pipe(richtwertSchema.shape.grenzeMsv),
    }),
  ),
});
export type RichtwerteFormularWerte = z.input<typeof richtwerteFormularSchema>;

/** Vorplanung: rechnet bei jeder Eingabe neu; bisherige Dosis leer zählt als 0. */
export const vorplanungFormularSchema = z.object({
  odl: odlText,
  odlEinheit: odlEinheitSchema,
  personId: z.string(),
  bisher: optionaleZahlText("Bitte die bisherige Dosis als Zahl in mSv eingeben.").pipe(
    z.number().nonnegative("Dosis darf nicht negativ sein").nullable(),
  ),
  richtwertId: z.string(),
});
export type VorplanungFormularWerte = z.input<typeof vorplanungFormularSchema>;
