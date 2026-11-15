import { z } from "zod";
import "@/lib/formular";
import { teilnehmerSchema } from "./protokoll";
import { kurzcodeSchema } from "./vermittlung-dienst";

/** Eigene Angaben: dieselben Regeln wie im Sitzungsprotokoll. */
export const ichFormularSchema = teilnehmerSchema.pick({ name: true, funktion: true, fahrzeug: true });

/**
 * „Gemeinsam arbeiten“ starten oder beitreten. Der Kurzcode zählt nur auf dem Weg „kurzcode“;
 * Leerzeichen und Trennzeichen beim Abtippen sind erlaubt.
 */
export const sitzungStartFormularSchema = ichFormularSchema
  .extend({
    weg: z.enum(["kurzcode", "qr"]),
    kurzcode: z.string().transform((text) => text.replace(/\D/g, "")),
  })
  .superRefine((w, ctx) => {
    if (w.weg === "kurzcode" && !kurzcodeSchema.safeParse(w.kurzcode).success) {
      ctx.addIssue({
        code: "custom",
        path: ["kurzcode"],
        message: w.kurzcode ? "Der Kurzcode hat sechs Ziffern." : "Bitte den Kurzcode vom Host eingeben.",
      });
    }
  });

export type SitzungStartFormularWerte = z.input<typeof sitzungStartFormularSchema>;
