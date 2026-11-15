import type { LucideIcon } from "lucide-react";

/**
 * Ein Eintrag der Befehlspalette (Strg+K). Die Palette zeigt die Befehle in
 * Gruppen; Tippen filtert über Text und Stichworte.
 */
export interface Befehl {
  id: string;
  text: string;
  /** Zweite Zeile, z. B. Ort eines Einsatzes oder Ziel einer Suche. */
  hinweis?: string;
  /** Weitere Suchwörter, die nicht angezeigt werden (z. B. „PDF“ für den Bericht). */
  stichworte?: string[];
  icon: LucideIcon;
  /** Tastenkürzel zur Anzeige rechts, z. B. ["Alt", "1"]. */
  kuerzel?: string[];
  /** Öffnet ein Ziel im Internet (neuer Tab), offline nicht erreichbar. */
  extern?: boolean;
  /** Immer zeigen, egal was getippt ist (z. B. „„…“ in externen Tools suchen“). */
  immer?: boolean;
  ausfuehren: () => void;
}

export type BefehlsGruppe = {
  titel: string;
  items: Befehl[];
  /** Nach hinten, sobald andere Gruppen Treffer haben (z. B. „Suchen“). */
  nachrangig?: boolean;
};

/** Kleinbuchstaben, Umlaute und ß ausgeschrieben, Akzente weg: „Übung“ findet „uebung“ und umgekehrt. */
export function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Passt der Befehl zur Eingabe? Jedes getippte Wort muss im Text, im Hinweis
 * oder in den Stichworten vorkommen, die Reihenfolge ist egal („ein tag“ findet
 * „Tagebuch-Eintrag schreiben“).
 */
export function passt(befehl: Befehl, eingabe: string): boolean {
  if (befehl.immer) return true;
  const woerter = normalisieren(eingabe).split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return true;
  const heuhaufen = normalisieren([befehl.text, befehl.hinweis ?? "", ...(befehl.stichworte ?? [])].join(" "));
  return woerter.every((w) => heuhaufen.includes(w));
}

/**
 * Gefilterte Gruppen in gleicher Reihenfolge; leere Gruppen fallen weg. Treffer,
 * bei denen ein Wort vorne im Text steht, rücken innerhalb der Gruppe nach oben.
 * Nachrangige Gruppen stehen vorn, wenn sonst nichts passt, und sonst am Ende:
 * „tagebuch“ + Enter öffnet das Tagebuch, „UN 1005“ + Enter die Suche.
 */
export function befehleFiltern(gruppen: BefehlsGruppe[], eingabe: string): BefehlsGruppe[] {
  const e = normalisieren(eingabe.trim());
  return gruppen
    .map((g) => {
      const treffer = g.items.filter((b) => passt(b, eingabe));
      if (!e) return { ...g, items: treffer };
      const rang = (b: Befehl) => {
        if (b.immer) return 0;
        const text = normalisieren(b.text);
        if (text.startsWith(e)) return 0;
        if (text.split(/[\s\-/]+/).some((w) => w.startsWith(e))) return 1;
        return 2;
      };
      return { ...g, items: treffer.map((b, i) => ({ b, i })).sort((x, y) => rang(x.b) - rang(y.b) || x.i - y.i).map((x) => x.b) };
    })
    .filter((g) => g.items.length > 0)
    .sort((a, b) => Number(Boolean(a.nachrangig)) - Number(Boolean(b.nachrangig)));
}

/** Tastenkürzel zum Öffnen: Strg+K, am Mac ⌘K. */
export function istPalettenKuerzel(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): boolean {
  return e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
}
