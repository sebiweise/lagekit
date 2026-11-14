import type { ExternesTool, Thema } from "./katalog";

/** Adresse für eine Direktsuche oder `null`, wenn das Tool keine anbietet. */
export function suchUrl(tool: ExternesTool, begriff: string, ort = ""): string | null {
  if (!tool.suche) return null;
  const b = begriff.trim();
  const o = ort.trim();
  const q = tool.suche.ortAnhaengen && o ? `${b} ${o}` : b;
  return tool.suche.muster
    .replaceAll("{q}", encodeURIComponent(q))
    .replaceAll("{ort}", encodeURIComponent(o));
}

/**
 * Schlagworte je Thema, geprüft gegen Stichwort und Ort des Einsatzes.
 * Treffer sind Wortanfänge, damit z. B. „Waldbrand“ und „Waldweg“ zu „wald“ passen.
 */
const SCHLAGWORTE: Record<Exclude<Thema, "kontakt" | "karte">, string[]> = {
  gefahrstoff: ["abc", "cbrn", "gefahrgut", "gefahrstoff", "gas", "chemie", "chemikal", "austritt", "leck", "öl", "ölspur", "gasaus", "gasgeruch", "säure", "lauge", "ammoniak", "chlor", "un"],
  strahlung: ["abc", "cbrn", "radioaktiv", "strahl", "rn", "kern", "nuklear"],
  fahrzeug: ["vu", "verkehrsunfall", "pkw", "lkw", "kfz", "eingeklemmt", "thvu", "autobahn", "bab", "bus", "fahrzeug", "elektrofahrzeug", "e-auto", "auto"],
  vegetation: ["wald", "vegetation", "flächenbrand", "feld", "wiese", "böschung", "gras", "moor", "heide", "flur", "stoppel", "acker"],
  wasser: ["hochwasser", "überflutung", "überschwemmung", "starkregen", "pegel", "deich", "fluss", "ufer", "unwetter"],
  warnung: ["unwetter", "sturm", "hochwasser", "großschaden", "manv", "abc", "cbrn", "katastrophe", "evakuierung"],
};

/** Kontakte und Karten passen zu jedem Einsatz. */
const IMMER: Thema[] = ["kontakt", "karte"];

function woerter(text: string): string[] {
  return text
    .toLocaleLowerCase("de-DE")
    .split(/[^\p{L}\p{N}-]+/u)
    .flatMap((w) => [w, ...w.split("-")])
    .filter(Boolean);
}

/**
 * Kurze Schlagworte (bis 3 Zeichen, z. B. „vu“, „un“) passen nur als ganzes Wort
 * oder mit angehängter Zahl („un1005“), längere als Wortanfang.
 */
function passtWort(wort: string, schlagwort: string): boolean {
  if (!wort.startsWith(schlagwort)) return false;
  if (schlagwort.length > 3) return true;
  return /^\d*$/.test(wort.slice(schlagwort.length));
}

/** Themen, die zu Stichwort und Ort des Einsatzes passen. */
export function themenFuerEinsatz(einsatz: { stichwort: string; ort: string }): Set<Thema> {
  const liste = woerter(`${einsatz.stichwort} ${einsatz.ort}`);
  const themen = new Set<Thema>(IMMER);
  for (const [thema, worte] of Object.entries(SCHLAGWORTE) as [Thema, string[]][]) {
    if (worte.some((s) => liste.some((w) => passtWort(w, s)))) themen.add(thema);
  }
  return themen;
}

/**
 * Teilt die Tools in Vorschläge für den Einsatz und den Rest. Alle Tools bleiben
 * immer erreichbar; ohne Einsatz gibt es keine Vorschläge.
 */
export function vorschlagen(
  tools: ExternesTool[],
  einsatz: { stichwort: string; ort: string } | null,
): { vorgeschlagen: ExternesTool[]; weitere: ExternesTool[] } {
  if (!einsatz) return { vorgeschlagen: [], weitere: tools };
  const themen = themenFuerEinsatz(einsatz);
  // Nur Kontakte und Karten sind kein Grund für einen eigenen Vorschlagsblock.
  const fachlich = [...themen].filter((t) => !IMMER.includes(t));
  if (fachlich.length === 0) return { vorgeschlagen: [], weitere: tools };
  const passt = (t: ExternesTool) => t.themen.some((th) => themen.has(th));
  // Fachliche Treffer zuerst, dann Kontakte und Karten.
  const fachlichPasst = (t: ExternesTool) => t.themen.some((th) => fachlich.includes(th));
  const vorgeschlagen = [...tools.filter(fachlichPasst), ...tools.filter((t) => passt(t) && !fachlichPasst(t))];
  return { vorgeschlagen, weitere: tools.filter((t) => !vorgeschlagen.includes(t)) };
}

/** Verlauf neueste zuerst. */
export function verlaufSortieren<T extends { zeitpunkt: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
}

export type BegriffArt = "un" | "cas" | "text";

/**
 * Erkennt UN-Nummern („1005“, „UN 1005“) und CAS-Nummern („7664-41-7“).
 * `wert` ist der Begriff so, wie er an die Ziele geht (UN-Nummer ohne „UN“).
 */
export function begriffErkennen(begriff: string): { art: BegriffArt; wert: string } {
  const b = begriff.trim();
  const un = /^(?:un\s*)?(\d{4})$/i.exec(b);
  if (un) return { art: "un", wert: un[1] };
  if (/^\d{2,7}-\d{2}-\d$/.test(b)) return { art: "cas", wert: b };
  return { art: "text", wert: b };
}

/**
 * Suchziele für einen Begriff: `direkt` (Suche über die Adresse) und `kopieren`
 * (Begriff kopieren, Startseite öffnen). UN- und CAS-Nummern gehen nur an
 * Stoffdatenbanken; sonst stehen zum Einsatz passende Tools vorn.
 */
export function suchziele(
  tools: ExternesTool[],
  begriff: string,
  einsatz: { stichwort: string; ort: string } | null,
): { art: BegriffArt; wert: string; direkt: ExternesTool[]; kopieren: ExternesTool[] } {
  const { art, wert } = begriffErkennen(begriff);
  let reihenfolge: ExternesTool[];
  if (art !== "text") {
    reihenfolge = tools.filter((t) => t.themen.includes("gefahrstoff"));
  } else {
    const { vorgeschlagen, weitere } = vorschlagen(tools, einsatz);
    reihenfolge = [...vorgeschlagen, ...weitere];
  }
  return {
    art,
    wert,
    direkt: reihenfolge.filter((t) => t.suche),
    kopieren: reihenfolge.filter((t) => !t.suche && t.kopierHinweis),
  };
}
