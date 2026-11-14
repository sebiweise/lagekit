/**
 * Rechenlogik der Dosisüberwachung. Reine Funktionen ohne UI und ohne Datenbank,
 * damit sie vollständig getestet und fachlich geprüft werden können.
 *
 * Grundformel bei konstanter Ortsdosisleistung (ODL):
 *   D = Ḣ · t            Dosis = Ortsdosisleistung × Aufenthaltsdauer
 *   D_gesamt = Σ Ḣᵢ · tᵢ
 *   t_max = (D_Richtwert − D_bisher) / Ḣ
 *
 * Intern wird immer in mSv und Stunden gerechnet.
 */
import type { Aufenthalt, OdlEinheit } from "./schema";

const MS_PRO_STUNDE = 3_600_000;

/** Ab diesem Anteil am Richtwert zeigt die Ampel Gelb. */
export const WARN_ANTEIL = 0.8;

export type Ampel = "gruen" | "gelb" | "rot";

/** Rechnet eine ODL in mSv/h um. */
export function odlInMsvProStunde(odl: number, einheit: OdlEinheit): number {
  switch (einheit) {
    case "µSv/h":
      return odl / 1000;
    case "mSv/h":
      return odl;
    case "Sv/h":
      return odl * 1000;
  }
}

/** Dauer zwischen zwei Zeitpunkten in Stunden; nie negativ. */
export function dauerStunden(beginn: string | Date, ende: string | Date): number {
  const ms = new Date(ende).getTime() - new Date(beginn).getTime();
  return Math.max(0, ms / MS_PRO_STUNDE);
}

export interface Dosisberechnung {
  /** ODL in mSv/h */
  odlMsvH: number;
  /** Dauer in Stunden */
  dauerH: number;
  /** Dosis in mSv */
  dosisMsv: number;
  /** true, wenn der Aufenthalt noch läuft und bis `jetzt` gerechnet wurde */
  laufend: boolean;
}

/** Dosis eines Aufenthalts; laufende Aufenthalte werden bis `jetzt` gerechnet. */
export function aufenthaltDosis(
  aufenthalt: Pick<Aufenthalt, "beginn" | "ende" | "odl" | "odlEinheit">,
  jetzt: Date,
): Dosisberechnung {
  const laufend = aufenthalt.ende === null;
  const odlMsvH = odlInMsvProStunde(aufenthalt.odl, aufenthalt.odlEinheit);
  const dauerH = dauerStunden(aufenthalt.beginn, aufenthalt.ende ?? jetzt);
  return { odlMsvH, dauerH, dosisMsv: odlMsvH * dauerH, laufend };
}

/** Gesamtdosis über alle Aufenthalte in mSv. */
export function gesamtdosis(aufenthalte: Aufenthalt[], jetzt: Date): number {
  return aufenthalte.reduce((summe, a) => summe + aufenthaltDosis(a, jetzt).dosisMsv, 0);
}

/** Summe der abgelesenen Dosimeterwerte; `null`, wenn kein Wert erfasst ist. */
export function dosimeterSumme(aufenthalte: Aufenthalt[]): number | null {
  const werte = aufenthalte.map((a) => a.dosimeterMsv).filter((w): w is number => w !== null);
  return werte.length === 0 ? null : werte.reduce((a, b) => a + b, 0);
}

/**
 * Ampel gegen einen Richtwert: Rot ab Erreichen des Richtwerts,
 * Gelb ab `WARN_ANTEIL` des Richtwerts, sonst Grün.
 * Wird die Dosimeteranzeige mit übergeben, zählt der höhere der beiden Werte.
 */
export function ampel(dosisMsv: number, richtwertMsv: number, dosimeterMsv: number | null = null): Ampel {
  const massgeblich = Math.max(dosisMsv, dosimeterMsv ?? 0);
  if (massgeblich >= richtwertMsv) return "rot";
  if (massgeblich >= richtwertMsv * WARN_ANTEIL) return "gelb";
  return "gruen";
}

/** Noch verfügbare Dosis bis zum Richtwert in mSv; nie negativ. */
export function restdosis(dosisMsv: number, richtwertMsv: number): number {
  return Math.max(0, richtwertMsv - dosisMsv);
}

/**
 * Wie lange darf man bei gegebener ODL noch bleiben, bis der Richtwert erreicht ist?
 * Ergebnis in Stunden; `Infinity` bei ODL 0.
 */
export function maxAufenthaltStunden(restdosisMsv: number, odlMsvH: number): number {
  if (restdosisMsv <= 0) return 0;
  if (odlMsvH <= 0) return Number.POSITIVE_INFINITY;
  return restdosisMsv / odlMsvH;
}

/** Zeitpunkt, zu dem der Richtwert bei gleichbleibender ODL erreicht wird. */
export function richtwertErreichtUm(jetzt: Date, restdosisMsv: number, odlMsvH: number): Date | null {
  const stunden = maxAufenthaltStunden(restdosisMsv, odlMsvH);
  if (!Number.isFinite(stunden)) return null;
  return new Date(jetzt.getTime() + stunden * MS_PRO_STUNDE);
}

// ---------- Darstellung ----------

const zahl = (wert: number, stellen: number) =>
  wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/** Dosis in mSv mit drei Nachkommastellen (1 µSv Auflösung). */
export function formatDosis(mSv: number): string {
  return `${zahl(mSv, 3)} mSv`;
}

export function formatOdl(odl: number, einheit: OdlEinheit): string {
  return `${odl.toLocaleString("de-DE", { maximumFractionDigits: 3 })} ${einheit}`;
}

export function formatStunden(h: number): string {
  return `${zahl(h, 2)} h`;
}

/**
 * Rechenweg zum Nachprüfen, z. B. `D = 0,250 mSv/h × 1,5000 h = 0,375 mSv`.
 * Die Dauer hat vier Nachkommastellen (≈ 0,4 s), damit die Rechnung von Hand
 * auf das angezeigte Ergebnis führt.
 */
export function rechenweg(b: Dosisberechnung): string {
  return `D = ${zahl(b.odlMsvH, 3)} mSv/h × ${zahl(b.dauerH, 4)} h = ${formatDosis(b.dosisMsv)}`;
}

/** Rechenweg der Vorplanung, z. B. `t = (100 mSv − 2,000 mSv) / 5,000 mSv/h = 19,60 h`. */
export function rechenwegVorplanung(richtwertMsv: number, bisherMsv: number, odlMsvH: number): string {
  const t = maxAufenthaltStunden(restdosis(bisherMsv, richtwertMsv), odlMsvH);
  const ergebnis = Number.isFinite(t) ? formatStunden(t) : "unbegrenzt";
  return `t = (${zahl(richtwertMsv, 3)} mSv − ${zahl(bisherMsv, 3)} mSv) / ${zahl(odlMsvH, 3)} mSv/h = ${ergebnis}`;
}
