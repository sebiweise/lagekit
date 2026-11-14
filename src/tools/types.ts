import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";
import type { LagekitDB } from "@/core/db/db";

/**
 * Jedes Tool meldet sich mit einem Manifest an. Die Startseite baut ihre
 * Kacheln aus `toolRegistry`, ohne die Tools selbst zu kennen.
 */
export interface ToolManifest {
  /** Ordnername unter `src/tools/` und Pfadsegment unter `/tools/`. */
  id: string;
  name: string;
  beschreibung: string;
  icon: LucideIcon;
  /** Version des Datenschemas, für Export/Import-Kompatibilität. */
  schemaVersion: number;
  /**
   * Dexie-Tabellen des Tools mit ihrem Zod-Schema. Jede Zeile braucht `id`
   * und `einsatzId` (beide indiziert), damit Export, Import und Löschen je
   * Einsatz ohne Wissen über das Tool funktionieren.
   */
  tabellen: Record<string, ZodType<EinsatzbezogeneZeile>>;
  /**
   * Optional: Konfliktlösung beim gemeinsamen Arbeiten. Der Host ruft die Funktion
   * für jede eingehende Zeile der Tabelle auf, bevor er sie speichert, und verteilt
   * das Ergebnis an alle Geräte (z. B. eindeutige laufende Nummern vergeben).
   */
  abgleich?: Record<string, (db: LagekitDB, zeile: EinsatzbezogeneZeile) => Promise<EinsatzbezogeneZeile>>;
}

export interface EinsatzbezogeneZeile {
  id: string;
  einsatzId: string;
}
