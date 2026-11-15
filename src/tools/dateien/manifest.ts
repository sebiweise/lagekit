import { FolderOpen } from "lucide-react";
import type { ToolManifest } from "@/tools/types";

export const dateienManifest: ToolManifest = {
  id: "dateien",
  name: "Dateien",
  beschreibung:
    "Verknüpfte Ordner des Einsatzes durchsehen, z. B. Drohnenaufnahmen und Fotos, und Dateien öffnen. Ordner verknüpfen geht in Chrome und Edge am PC.",
  icon: FolderOpen,
  schemaVersion: 1,
  // Ordner gehören zum Gerät (Tabelle `ordner` im Kern), nicht zur Sicherung des Einsatzes.
  tabellen: {},
};
