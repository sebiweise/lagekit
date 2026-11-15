import type { Eintrag } from "@/tools/einsatztagebuch/schema";
import type { BenachrichtigungEingabe } from "./verlauf";

export const TAGEBUCH_PFAD = "/tools/einsatztagebuch/";
export const DATEIEN_PFAD = "/tools/dateien/";

/** Ab so vielen Einträgen auf einmal (z. B. beim Beitritt) nur noch eine Sammelmeldung. */
export const SAMMEL_AB = 4;
const MAX_TEXT = 140;

function kuerzen(text: string, max = MAX_TEXT): string {
  const eineZeile = text.replace(/\s+/g, " ").trim();
  return eineZeile.length > max ? `${eineZeile.slice(0, max - 1)}…` : eineZeile;
}

/** Meldung zu neuen Tagebucheinträgen von anderen Geräten oder Tabs. */
export function tagebuchMeldung(neu: readonly Eintrag[]): BenachrichtigungEingabe | null {
  if (neu.length === 0) return null;
  const basis = { art: "tagebuch" as const, href: TAGEBUCH_PFAD, linkText: "Tagebuch öffnen" };
  if (neu.length >= SAMMEL_AB) {
    const nummern = neu.map((e) => e.nr).sort((a, b) => a - b);
    return {
      ...basis,
      titel: `${neu.length} neue Einträge im Tagebuch`,
      text: `Nr. ${nummern[0]} bis ${nummern[nummern.length - 1]}`,
    };
  }
  if (neu.length === 1) {
    const e = neu[0];
    const wer = [e.von && `von ${e.von}`, e.an && `an ${e.an}`].filter(Boolean).join(" ");
    return {
      ...basis,
      titel: `Tagebuch Nr. ${e.nr}: ${e.korrigiertEintragId ? `${e.art} (Korrektur)` : e.art}${wer ? ` ${wer}` : ""}`,
      text: kuerzen(e.inhalt),
    };
  }
  return {
    ...basis,
    titel: `${neu.length} neue Einträge im Tagebuch`,
    text: kuerzen(neu.map((e) => `Nr. ${e.nr}: ${e.inhalt}`).join(" · ")),
  };
}

/** Meldung zu neuen Dateien in verknüpften Ordnern. */
export function dateienMeldung(neu: readonly { name: string; anzahl: number }[]): BenachrichtigungEingabe | null {
  const mit = neu.filter((o) => o.anzahl > 0);
  if (mit.length === 0) return null;
  const summe = mit.reduce((s, o) => s + o.anzahl, 0);
  return {
    art: "dateien",
    titel: summe === 1 ? "Neue Datei" : `${summe} neue Dateien`,
    text: mit.map((o) => `${o.anzahl} in „${o.name}“`).join(", "),
    href: DATEIEN_PFAD,
    linkText: "Ansehen",
  };
}

export function updateMeldung(version: string | null, datenUmbau: boolean): BenachrichtigungEingabe {
  return {
    art: "update",
    titel: version ? `Neue Version ${version} verfügbar` : "Neue Version verfügbar",
    text: datenUmbau
      ? "Gespeicherte Daten werden beim Update umgebaut. Vorher die Änderungen lesen."
      : "Aktualisiert wird erst nach Bestätigung, am besten nach dem Einsatz.",
    href: "/aenderungen/",
    linkText: "Änderungen ansehen",
  };
}
