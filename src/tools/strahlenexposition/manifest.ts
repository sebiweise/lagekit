import { Radiation } from "lucide-react";
import type { ToolManifest } from "@/tools/types";
import { TABELLE_AUFENTHALTE, TABELLE_PERSONEN } from "./repository";
import { aufenthaltSchema, personSchema } from "./schema";

export const strahlenexpositionManifest: ToolManifest = {
  id: "strahlenexposition",
  name: "Strahlenexposition",
  beschreibung:
    "Dosisüberwachung je Person: Aufenthalte mit Ortsdosisleistung, Gesamtdosis mit Ampel, Vorplanung und Dosisnachweis.",
  icon: Radiation,
  schemaVersion: 1,
  tabellen: {
    [TABELLE_PERSONEN]: personSchema,
    [TABELLE_AUFENTHALTE]: aufenthaltSchema,
  },
};
