import { csvErstellen } from "@/core/export/csv";
import type { Suche } from "./schema";

/** Suchverlauf als CSV, älteste Suche zuerst. */
export function suchverlaufCsv(suchen: Suche[]): string {
  const zeilen = [...suchen].sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));
  return csvErstellen(zeilen, [
    { titel: "Zeitpunkt", wert: (s) => s.zeitpunkt },
    { titel: "Tool", wert: (s) => s.toolName },
    { titel: "Begriff", wert: (s) => s.begriff },
    { titel: "Ort", wert: (s) => s.ort },
    { titel: "Art", wert: (s) => (s.art === "direkt" ? "direkt gesucht" : "Begriff kopiert") },
    { titel: "Adresse", wert: (s) => s.url },
  ]);
}
