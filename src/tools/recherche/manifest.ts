import { Globe } from "lucide-react";
import type { ToolManifest } from "@/tools/types";
import { TABELLE_SUCHEN } from "./repository";
import { sucheSchema } from "./schema";

export const rechercheManifest: ToolManifest = {
  id: "recherche",
  name: "Externe Tools",
  beschreibung:
    "Stoffrecherche, Rettungskarten, Vegetationsbrand, Warnungen und Kontakte. Vorschläge passend zum Einsatz, Suchen landen im Verlauf. Braucht Internet.",
  icon: Globe,
  schemaVersion: 1,
  tabellen: {
    [TABELLE_SUCHEN]: sucheSchema,
  },
};
