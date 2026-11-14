import type { Richtwert } from "./schema";

/**
 * Voreingestellte Dosisrichtwerte (effektive Dosis je Einsatz).
 *
 * Quelle der Werte 100, 250 und 500 mSv: § 114 Strahlenschutzgesetz (StrlSchG).
 * Die Werte 1 mSv (Übung) und 20 mSv (Sachwerte) hat ein Feuerwehr-Fachanwender
 * nach FwDV 500 angegeben.
 * Fachliche Grundlage: docs/fachlich/strahlenexposition.md.
 */
export const STANDARD_RICHTWERTE: Richtwert[] = [
  {
    id: "uebung",
    bezeichnung: "Übung",
    grenzeMsv: 1,
    hinweis: "FwDV 500. Gilt je Übung und zugleich als Summe je Kalenderjahr.",
  },
  {
    id: "sachwerte",
    bezeichnung: "Schutz von Sachwerten",
    grenzeMsv: 20,
    hinweis: "FwDV 500.",
  },
  {
    id: "personen",
    bezeichnung: "Schutz von Leben oder Gesundheit",
    grenzeMsv: 100,
    hinweis: "§ 114 Abs. 2 StrlSchG. Keine Schwangeren und keine Personen unter 18 Jahren.",
  },
  {
    id: "lebensrettung",
    bezeichnung: "Lebensrettung, Abwehr einer Katastrophe",
    grenzeMsv: 250,
    hinweis: "§ 114 Abs. 3 StrlSchG. Nur Freiwillige, vorher über das Risiko informiert.",
  },
  {
    id: "ausnahme",
    bezeichnung: "Ausnahme durch die Einsatzleitung",
    grenzeMsv: 500,
    hinweis: "§ 114 Abs. 3 StrlSchG. Nur Freiwillige, nur in Ausnahmefällen.",
  },
];

export const STANDARD_RICHTWERT_ID = "personen";
