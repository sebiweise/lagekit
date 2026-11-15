/** Bietet einen Text als Datei zum Speichern an; funktioniert ohne Netz. */
export function dateiHerunterladen(dateiname: string, inhalt: string | Blob, mimeType: string): void {
  const blob = typeof inhalt === "string" ? new Blob([inhalt], { type: mimeType }) : inhalt;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Großzügig: Große ZIPs brauchen etwas, bis der Browser sie gespeichert hat.
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export function jsonHerunterladen(dateiname: string, daten: unknown): void {
  dateiHerunterladen(dateiname, JSON.stringify(daten, null, 2), "application/json");
}

export function csvHerunterladen(dateiname: string, csv: string): void {
  dateiHerunterladen(dateiname, csv, "text/csv;charset=utf-8");
}
