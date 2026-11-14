import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";

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
}

export interface EinsatzbezogeneZeile {
  id: string;
  einsatzId: string;
}
