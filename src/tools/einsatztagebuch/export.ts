import { csvErstellen } from "@/core/export/csv";
import type { Einsatz } from "@/core/einsatz/schema";
import { dateinamenTeil } from "@/core/export/json";
import { chronologisch, korrekturen } from "./logic";
import type { Eintrag } from "./schema";

export function tagebuchCsv(eintraege: Eintrag[]): string {
  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  const korrigiertDurch = korrekturen(eintraege);
  return csvErstellen(chronologisch(eintraege), [
    { titel: "Nr.", wert: (e) => e.nr },
    { titel: "Zeitpunkt", wert: (e) => e.zeitpunkt },
    { titel: "Erfasst am", wert: (e) => e.erfasstAm },
    { titel: "Art", wert: (e) => e.art },
    { titel: "Von", wert: (e) => e.von },
    { titel: "An", wert: (e) => e.an },
    { titel: "Inhalt", wert: (e) => e.inhalt },
    { titel: "Verfasser", wert: (e) => e.verfasser },
    { titel: "Korrigiert Nr.", wert: (e) => (e.korrigiertEintragId ? nachId.get(e.korrigiertEintragId)?.nr : null) },
    { titel: "Korrigiert durch Nr.", wert: (e) => korrigiertDurch.get(e.id)?.nr },
  ]);
}

export function tagebuchCsvDateiname(einsatz: Einsatz, jetzt: Date = new Date()): string {
  return `lagekit-${jetzt.toISOString().slice(0, 10)}-${dateinamenTeil(einsatz.stichwort)}-tagebuch.csv`;
}
