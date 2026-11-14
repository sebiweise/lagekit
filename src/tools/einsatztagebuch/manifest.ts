import { NotebookPen } from "lucide-react";
import type { ToolManifest } from "@/tools/types";
import { TABELLE_EINTRAEGE } from "./repository";
import { eintragSchema } from "./schema";

export const einsatztagebuchManifest: ToolManifest = {
  id: "einsatztagebuch",
  name: "Einsatztagebuch",
  beschreibung:
    "Fortlaufendes Tagebuch mit Schnellerfassung per Enter, Korrektur als neuer Eintrag, Filter, Suche und Druckfassung.",
  icon: NotebookPen,
  schemaVersion: 1,
  tabellen: {
    [TABELLE_EINTRAEGE]: eintragSchema,
  },
};
