/**
 * Hell/Dunkel-Darstellung. Standard ist die Systemeinstellung; eine eigene
 * Wahl wird nur auf diesem Gerät gespeichert (localStorage, kein Sync).
 *
 * Das aufgelöste Schema steht als Klasse `light` bzw. `dark` am <html>.
 * Ein kleines Inline-Skript im <head> setzt sie vor dem ersten Zeichnen,
 * damit die Seite im statischen Export nicht hell aufblitzt.
 */
export type Farbschema = "system" | "hell" | "dunkel";

export const FARBSCHEMA_SCHLUESSEL = "lagekit.farbschema";
export const FARBSCHEMA_REIHENFOLGE: readonly Farbschema[] = ["system", "hell", "dunkel"];

export function istFarbschema(wert: unknown): wert is Farbschema {
  return wert === "system" || wert === "hell" || wert === "dunkel";
}

/** Löst die Wahl in die tatsächliche Darstellung auf. */
export function aufloesen(wahl: Farbschema, systemDunkel: boolean): "light" | "dark" {
  if (wahl === "hell") return "light";
  if (wahl === "dunkel") return "dark";
  return systemDunkel ? "dark" : "light";
}

/**
 * Inline im <head>, läuft vor dem ersten Zeichnen. Bewusst ohne Abhängigkeiten
 * und mit try/catch: Ohne localStorage (privater Modus) gilt die Systemeinstellung,
 * ohne JavaScript greift die CSS-Medienabfrage.
 */
export const FARBSCHEMA_SKRIPT = `(function(){try{var w=localStorage.getItem(${JSON.stringify(FARBSCHEMA_SCHLUESSEL)});var d=w==="dunkel"||(w!=="hell"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.remove("light","dark");c.add(d?"dark":"light");}catch(e){}})();`;
