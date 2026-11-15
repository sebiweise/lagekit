/**
 * Zustand des Arbeitsbereichs: welche Tools als Tabs offen sind, wie der Bildschirm
 * aufgeteilt ist und welches Tool in welchem Feld steht.
 * Reine Funktionen, damit sie ohne Browser testbar sind.
 */

export type Aufteilung = "eins" | "zwei" | "uebereinander" | "drei" | "vier";

/** Größte Zahl an Feldern; so viele merkt sich der Zustand immer, auch wenn weniger sichtbar sind. */
export const MAX_FELDER = 4;

/**
 * Spalten je Aufteilung, darin die Feldnummern von oben nach unten.
 * Feld 1 steht immer links oben; die Nummern folgen der Leserichtung.
 */
const SPALTEN: Record<Aufteilung, number[][]> = {
  eins: [[0]],
  zwei: [[0], [1]],
  uebereinander: [[0, 1]],
  drei: [[0], [1, 2]],
  vier: [
    [0, 2],
    [1, 3],
  ],
};

export const AUFTEILUNGEN: { id: Aufteilung; name: string }[] = [
  { id: "eins", name: "Ein Tool" },
  { id: "zwei", name: "Zwei nebeneinander" },
  { id: "uebereinander", name: "Zwei übereinander" },
  { id: "drei", name: "Drei: eins links, zwei rechts" },
  { id: "vier", name: "Vier im Raster" },
];

export function felderVon(a: Aufteilung): number {
  return SPALTEN[a].flat().length;
}

export interface Arbeitsbereich {
  /** Offene Tabs in Reihenfolge. */
  offen: string[];
  aufteilung: Aufteilung;
  /** Tool je Feld; immer MAX_FELDER Einträge, damit ein Wechsel der Aufteilung nichts vergisst. */
  felder: (string | null)[];
  /** Feld, das ein Tipp auf einen Tab füllt. */
  fokus: number;
  /** Anteil der linken Spalte an der Breite. */
  spalte: number;
  /** Anteil des oberen Felds an der Höhe, je Spalte. */
  zeilen: [number, number];
}

const MIN_ANTEIL = 0.2;
const MAX_ANTEIL = 0.8;

export const LEER: Arbeitsbereich = {
  offen: [],
  aufteilung: "eins",
  felder: [null, null, null, null],
  fokus: 0,
  spalte: 0.5,
  zeilen: [0.5, 0.5],
};

export function anteil(wert: unknown): number {
  if (typeof wert !== "number" || !Number.isFinite(wert)) return 0.5;
  return Math.min(MAX_ANTEIL, Math.max(MIN_ANTEIL, wert));
}

/** Prüft gespeicherte Daten (auch das ältere Format mit links/rechts) und verwirft unbekannte Tools. */
export function bereinigen(roh: unknown, bekannt: string[]): Arbeitsbereich {
  if (typeof roh !== "object" || roh === null) return LEER;
  const r = roh as Partial<Arbeitsbereich> & { links?: unknown; rechts?: unknown; geteilt?: unknown };
  const offen = Array.isArray(r.offen)
    ? [...new Set(r.offen.filter((id): id is string => typeof id === "string" && bekannt.includes(id)))]
    : [];

  let aufteilung: Aufteilung = AUFTEILUNGEN.some((a) => a.id === r.aufteilung) ? (r.aufteilung as Aufteilung) : "eins";
  let felderRoh: unknown[] = Array.isArray(r.felder) ? r.felder : [];
  let fokus = typeof r.fokus === "number" ? r.fokus : 0;
  if (!Array.isArray(r.felder) && ("links" in r || "rechts" in r)) {
    // Format bis PR #17: links/rechts und ein Schalter für die geteilte Ansicht.
    felderRoh = [r.links, r.rechts];
    aufteilung = r.geteilt === true ? "zwei" : "eins";
    fokus = (r.fokus as unknown) === "rechts" ? 1 : 0;
  }

  const felder: (string | null)[] = [];
  for (let i = 0; i < MAX_FELDER; i++) {
    const id = felderRoh[i];
    felder.push(typeof id === "string" && offen.includes(id) && !felder.includes(id) ? id : null);
  }
  if (!felder[0] && offen.length > 0) felder[0] = offen.find((o) => !felder.includes(o)) ?? null;

  const zeilen = Array.isArray(r.zeilen) ? r.zeilen : [];
  return {
    offen,
    aufteilung,
    felder,
    fokus: Number.isInteger(fokus) && fokus >= 0 && fokus < felderVon(aufteilung) ? fokus : 0,
    spalte: anteil(r.spalte),
    zeilen: [anteil(zeilen[0]), anteil(zeilen[1])],
  };
}

/** Sichtbare Felder der aktuellen Aufteilung. */
export function sichtbareFelder(z: Arbeitsbereich): (string | null)[] {
  return z.felder.slice(0, felderVon(z.aufteilung));
}

/** In welchem sichtbaren Feld ein Tool steht, sonst null. */
export function feldVon(z: Arbeitsbereich, id: string): number | null {
  const i = sichtbareFelder(z).indexOf(id);
  return i < 0 ? null : i;
}

/**
 * Setzt ein Tool in ein Feld und öffnet es als Tab, falls nötig.
 * Stand es schon in einem anderen Feld, tauschen die beiden Felder ihren Inhalt.
 */
export function platzieren(z: Arbeitsbereich, feld: number, id: string): Arbeitsbereich {
  const offen = z.offen.includes(id) ? z.offen : [...z.offen, id];
  const felder = [...z.felder];
  const vorher = felder.indexOf(id);
  if (vorher >= 0) felder[vorher] = felder[feld];
  felder[feld] = id;
  return { ...z, offen, felder, fokus: feld };
}

/** Zeigt ein Tool im Feld mit Fokus. */
export function zeigen(z: Arbeitsbereich, id: string): Arbeitsbereich {
  return { ...platzieren(z, z.fokus, id), fokus: z.fokus };
}

/** Tauscht den Inhalt zweier Felder. */
export function tauschen(z: Arbeitsbereich, a: number, b: number): Arbeitsbereich {
  const felder = [...z.felder];
  [felder[a], felder[b]] = [felder[b], felder[a]];
  return { ...z, felder };
}

/** Leert ein Feld; das Tool bleibt als Tab offen. */
export function leeren(z: Arbeitsbereich, feld: number): Arbeitsbereich {
  const felder = [...z.felder];
  felder[feld] = null;
  return { ...z, felder, fokus: feld };
}

/** Füllt leere sichtbare Felder mit offenen Tabs, die noch nirgends zu sehen sind. */
function auffuellen(z: Arbeitsbereich): Arbeitsbereich {
  const n = felderVon(z.aufteilung);
  const felder = [...z.felder];
  for (let i = 0; i < n; i++) {
    if (felder[i]) continue;
    const frei = z.offen.find((o) => !felder.slice(0, n).includes(o));
    if (!frei) break;
    const versteckt = felder.indexOf(frei);
    if (versteckt >= n) felder[versteckt] = null;
    felder[i] = frei;
  }
  return { ...z, felder };
}

/** Schließt einen Tab; ein Feld, das ihn zeigte, zeigt dann einen anderen offenen Tab. */
export function schliessen(z: Arbeitsbereich, id: string): Arbeitsbereich {
  const offen = z.offen.filter((o) => o !== id);
  const felder = z.felder.map((f) => (f === id ? null : f));
  const n = felderVon(z.aufteilung);
  // Nach links aufrücken, damit Feld 1 nicht leer bleibt, wenn es noch etwas zu zeigen gibt.
  const ergebnis = auffuellen({ ...z, offen, felder });
  if (!ergebnis.felder[0]) {
    const naechstes = ergebnis.felder.slice(1, n).findIndex(Boolean);
    if (naechstes >= 0) return tauschen(ergebnis, 0, naechstes + 1);
  }
  return ergebnis;
}

/** Wechselt die Aufteilung; neue Felder zeigen offene Tabs, die noch nirgends zu sehen sind. */
export function aufteilen(z: Arbeitsbereich, aufteilung: Aufteilung): Arbeitsbereich {
  const n = felderVon(aufteilung);
  const ergebnis = auffuellen({ ...z, aufteilung });
  const leer = ergebnis.felder.slice(0, n).indexOf(null);
  return { ...ergebnis, fokus: leer >= 0 ? leer : Math.min(z.fokus, n - 1) };
}

/** Ein Rechteck in Anteilen der Fläche (0 bis 1). */
export interface Rechteck {
  x: number;
  y: number;
  b: number;
  h: number;
}

export type Trenner =
  | { art: "spalte"; x: number }
  | { art: "zeile"; spalte: 0 | 1; x: number; b: number; y: number };

/** Lage der sichtbaren Felder und der verschiebbaren Trenner. */
export function geometrie(z: Arbeitsbereich): { felder: Rechteck[]; trenner: Trenner[] } {
  const spalten = SPALTEN[z.aufteilung];
  const felder: Rechteck[] = [];
  const trenner: Trenner[] = [];
  const breiten = spalten.length === 2 ? [z.spalte, 1 - z.spalte] : [1];
  if (spalten.length === 2) trenner.push({ art: "spalte", x: z.spalte });
  spalten.forEach((inhalt, s) => {
    const x = s === 0 ? 0 : z.spalte;
    const b = breiten[s];
    const oben = z.zeilen[s];
    inhalt.forEach((feld, zeile) => {
      felder[feld] =
        inhalt.length === 1
          ? { x, y: 0, b, h: 1 }
          : zeile === 0
            ? { x, y: 0, b, h: oben }
            : { x, y: oben, b, h: 1 - oben };
    });
    if (inhalt.length === 2) trenner.push({ art: "zeile", spalte: s as 0 | 1, x, b, y: oben });
  });
  return { felder, trenner };
}
