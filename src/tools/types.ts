import type { LucideIcon } from "lucide-react";

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
}
