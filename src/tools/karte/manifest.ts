import { Map as KartenIcon } from "lucide-react";
import type { ToolManifest } from "@/tools/types";

export const karteManifest: ToolManifest = {
  id: "karte",
  name: "Karte",
  beschreibung:
    "OpenStreetMap mit Einsatzort, eigenem Standort, UTMREF und Entfernung. Punkt antippen, um ihn als Einsatzort zu setzen. Kartenbild braucht Internet.",
  icon: KartenIcon,
  schemaVersion: 1,
  // Der Einsatzort gehört zum Einsatz selbst; die Karte hat keine eigenen Daten.
  tabellen: {},
};
