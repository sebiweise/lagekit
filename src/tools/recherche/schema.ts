import { z } from "zod";

/**
 * Eine aus Lagekit gestartete Suche in einem externen Tool. Wird je Einsatz
 * gespeichert, damit die Suche später erneut geöffnet werden kann.
 */
export const sucheSchema = z.object({
  id: z.uuid(),
  einsatzId: z.uuid(),
  zeitpunkt: z.iso.datetime({ offset: true }),
  toolId: z.string().min(1),
  /** Name zum Zeitpunkt der Suche, damit der Verlauf lesbar bleibt, auch wenn das Tool später fehlt. */
  toolName: z.string().min(1),
  begriff: z.string().trim().min(1, "Suchbegriff fehlt"),
  ort: z.string().trim().default(""),
  /** Aufgerufene Adresse. */
  url: z.url(),
  /** `direkt`: Suche über die Adresse; `kopiert`: Begriff kopiert, Startseite geöffnet. */
  art: z.enum(["direkt", "kopiert"]),
});
export type Suche = z.infer<typeof sucheSchema>;
