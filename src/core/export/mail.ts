/**
 * Versand per E-Mail ohne Server: Lagekit öffnet nur das Mailprogramm des
 * Geräts. Zwei Wege:
 *
 * - `mailto:`-Link: geht überall, kann aber keine Datei anhängen. Die Datei
 *   wird vorher gespeichert und muss im Mailprogramm angehängt werden.
 * - Teilen (Web Share API): übergibt die Datei direkt an Mail, Outlook usw.
 *   Gibt es auf iPhone, iPad, Android und in Chrome/Edge unter Windows.
 */

/**
 * Längster mailto-Link, den Windows (Outlook, Thunderbird über ShellExecute)
 * sicher annimmt. Längere Texte werden gekürzt.
 */
export const MAILTO_MAX = 1900;

const GEKUERZT = "\n\n[… gekürzt, vollständig im Anhang]";

function kodieren(text: string): string {
  // mailto verlangt CRLF als Zeilenumbruch.
  return encodeURIComponent(text.replace(/\r?\n/g, "\r\n"));
}

export interface Mail {
  an?: string;
  betreff: string;
  text: string;
}

/** Baut einen mailto-Link; zu lange Texte werden zeilenweise gekürzt. */
export function mailtoLink({ an = "", betreff, text }: Mail, max = MAILTO_MAX): string {
  const empfaenger = an
    .split(/[;,\s]+/)
    .filter(Boolean)
    .map((a) => encodeURIComponent(a).replace(/%40/g, "@"))
    .join(",");
  const anfang = `mailto:${empfaenger}?subject=${kodieren(betreff)}&body=`;
  const voll = anfang + kodieren(text);
  if (voll.length <= max) return voll;

  const zeilen = text.split("\n");
  while (zeilen.length > 1) {
    zeilen.pop();
    const link = anfang + kodieren(zeilen.join("\n") + GEKUERZT);
    if (link.length <= max) return link;
  }
  return anfang + kodieren(GEKUERZT.trim());
}

/** Prüft, ob das Gerät Dateien an andere Apps (z. B. Mail) teilen kann. */
export function dateienTeilenMoeglich(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File(["x"], "test.txt", { type: "text/plain" })] });
  } catch {
    return false;
  }
}

export type TeilenErgebnis = "geteilt" | "abgebrochen" | "nicht-moeglich";

export async function dateiTeilen(datei: File, mail: Mail): Promise<TeilenErgebnis> {
  const daten = { files: [datei], title: mail.betreff, text: mail.text };
  if (!navigator.canShare?.(daten)) return "nicht-moeglich";
  try {
    await navigator.share(daten);
    return "geteilt";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "abgebrochen";
    throw e;
  }
}

/** Öffnet das Mailprogramm. Ein Link-Klick statt `location`, damit die Seite bleibt. */
export function mailprogrammOeffnen(link: string): void {
  const a = document.createElement("a");
  a.href = link;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}
