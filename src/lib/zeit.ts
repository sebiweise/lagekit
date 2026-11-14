/** Zeitformatierung einheitlich auf Deutsch, immer in der Zeitzone des Geräts. */

const datumZeit = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const nurZeit = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const nurZeitSekunden = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatDatumZeit(iso: string | Date): string {
  return datumZeit.format(new Date(iso));
}

export function formatZeit(iso: string | Date, sekunden = false): string {
  return (sekunden ? nurZeitSekunden : nurZeit).format(new Date(iso));
}

/** Wert für `<input type="datetime-local">` in Ortszeit, z. B. `2026-11-14T15:30`. */
export function zuDatetimeLocal(datum: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${datum.getFullYear()}-${p(datum.getMonth() + 1)}-${p(datum.getDate())}T${p(datum.getHours())}:${p(datum.getMinutes())}`;
}

/** Liest einen `datetime-local`-Wert (Ortszeit) als ISO-Zeitpunkt; `null` bei leerer oder ungültiger Eingabe. */
export function vonDatetimeLocal(wert: string): string | null {
  if (!wert) return null;
  const datum = new Date(wert);
  return Number.isNaN(datum.getTime()) ? null : datum.toISOString();
}

/** Dauer in Minuten als `1 h 05 min` bzw. `45 min`. */
export function formatDauer(minuten: number): string {
  const gerundet = Math.round(minuten);
  if (gerundet < 60) return `${gerundet} min`;
  const h = Math.floor(gerundet / 60);
  const m = gerundet % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}
