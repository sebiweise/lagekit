/** Liest eine Zahl mit Komma oder Punkt; `null` bei leerer oder ungültiger Eingabe. */
export function zahlLesen(eingabe: string): number | null {
  const text = eingabe.trim().replace(/\s/g, "").replace(",", ".");
  if (text === "") return null;
  const wert = Number(text);
  return Number.isFinite(wert) ? wert : null;
}
