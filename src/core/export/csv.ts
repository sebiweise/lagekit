/**
 * CSV für Tabellenkalkulationen (Excel, LibreOffice) mit deutschen Einstellungen:
 * Semikolon als Trenner, UTF-8 mit BOM, Zeilenende CRLF.
 */
export interface CsvSpalte<T> {
  titel: string;
  wert: (zeile: T) => string | number | null | undefined;
}

const TRENNER = ";";

function feld(wert: string | number | null | undefined): string {
  if (wert === null || wert === undefined) return "";
  const text =
    typeof wert === "number" ? wert.toLocaleString("de-DE", { useGrouping: false, maximumFractionDigits: 6 }) : wert;
  // Formel-Injektion in Tabellenkalkulationen verhindern.
  const sicher = /^[=+\-@\t\r]/.test(text) && typeof wert === "string" ? `'${text}` : text;
  return /[";\r\n]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
}

export function csvErstellen<T>(zeilen: T[], spalten: CsvSpalte<T>[]): string {
  const kopf = spalten.map((s) => feld(s.titel)).join(TRENNER);
  const inhalt = zeilen.map((z) => spalten.map((s) => feld(s.wert(z))).join(TRENNER));
  return "﻿" + [kopf, ...inhalt].join("\r\n") + "\r\n";
}
