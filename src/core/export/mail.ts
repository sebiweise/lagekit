/**
 * Versand per E-Mail ohne Server: Lagekit öffnet nur das Mailprogramm des
 * Geräts. Zwei Wege:
 *
 * - `mailto:`-Link: geht überall, kann aber keine Datei anhängen. Die Datei
 *   wird vorher gespeichert und muss im Mailprogramm angehängt werden.
 * - Teilen (Web Share API): übergibt die Datei direkt an Mail, Outlook usw.
 *   Gibt es auf iPhone, iPad, Android und in Chrome/Edge unter Windows.
 */

import { z } from "zod";
import "@/lib/formular";

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

/** Empfänger aus einem Textfeld: getrennt durch Komma, Semikolon oder Leerzeichen. */
export function empfaengerListe(text: string): string[] {
  return text.split(/[;,\s]+/).filter(Boolean);
}

const adresseSchema = z.email();

/** Empfängerfeld: leer oder nur gültige E-Mail-Adressen. */
export const empfaengerSchema = z.string().superRefine((text, ctx) => {
  const falsch = empfaengerListe(text).filter((a) => !adresseSchema.safeParse(a).success);
  if (falsch.length === 0) return;
  ctx.addIssue({
    code: "custom",
    message:
      falsch.length === 1
        ? `„${falsch[0]}“ ist keine gültige E-Mail-Adresse.`
        : `Keine gültigen E-Mail-Adressen: ${falsch.map((a) => `„${a}“`).join(", ")}.`,
  });
});

/** Baut einen mailto-Link; zu lange Texte werden zeilenweise gekürzt. */
export function mailtoLink({ an = "", betreff, text }: Mail, max = MAILTO_MAX): string {
  const empfaenger = empfaengerListe(an)
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
