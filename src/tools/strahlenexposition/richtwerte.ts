import type { Richtwert } from "./schema";

/**
 * Voreingestellte Dosisrichtwerte (effektive Dosis je Einsatz).
 *
 * Quelle der Werte 100, 250 und 500 mSv: § 114 Strahlenschutzgesetz (StrlSchG).
 * Der Wert 15 mSv stammt aus dem Projektplan (FwDV 500, aus dem Gedächtnis) und
 * ist vor Version 1.0 gegen die FwDV 500 (Stand 2022) zu prüfen.
 * Fachliche Grundlage: docs/fachlich/strahlenexposition.md.
 */
export const STANDARD_RICHTWERTE: Richtwert[] = [
  {
    id: "sachwerte",
    bezeichnung: "Schutz von Sachwerten",
    grenzeMsv: 15,
    hinweis: "Wert aus dem Projektplan, gegen FwDV 500 prüfen.",
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
