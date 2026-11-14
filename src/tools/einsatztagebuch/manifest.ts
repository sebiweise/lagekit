import { NotebookPen } from "lucide-react";
import type { ToolManifest } from "@/tools/types";
import { naechsteNummer } from "./logic";
import { eintraege, TABELLE_EINTRAEGE } from "./repository";
import { eintragSchema, type Eintrag } from "./schema";

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
  abgleich: {
    // Zwei Geräte können offline dieselbe Nummer vergeben; der Host vergibt dann die nächste freie.
    [TABELLE_EINTRAEGE]: async (db, zeile) => {
      const eintrag = zeile as Eintrag;
      const vorhandene = await eintraege(db).where("einsatzId").equals(eintrag.einsatzId).toArray();
      const gleich = vorhandene.find((e) => e.id === eintrag.id);
      if (gleich) return { ...eintrag, nr: gleich.nr };
      if (!vorhandene.some((e) => e.nr === eintrag.nr)) return eintrag;
      return { ...eintrag, nr: naechsteNummer(vorhandene) };
    },
  },
};
