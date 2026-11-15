import { z } from "zod";
import { zahlLesen } from "./zahl";
import { vonDatetimeLocal } from "./zeit";

// Deutsche Standardmeldungen für alles, was keine eigene Meldung hat.
z.config(z.locales.de());

/**
 * Bausteine für Formularschemas (react-hook-form + zod). Formularfelder liefern immer
 * Text; diese Schemas lesen ihn so, wie Einsatzkräfte tippen (Komma, leer = nichts),
 * und geben die Werte im Format des Datenmodells weiter.
 */

/** Pflichttext, getrimmt. */
export function pflichtText(meldung: string) {
  return z.string().trim().min(1, meldung);
}

/** Zahl mit Komma oder Punkt; leer oder ungültig ist ein Fehler. */
export function zahlText(meldung = "Bitte eine Zahl eingeben, z. B. 0,5.") {
  return z.string().transform((text, ctx) => {
    const wert = zahlLesen(text);
    if (wert === null) {
      ctx.addIssue({ code: "custom", message: text.trim() ? meldung : "Bitte einen Wert eingeben." });
      return z.NEVER;
    }
    return wert;
  });
}

/** Zahl mit Komma oder Punkt; leer ergibt `null`, ungültiger Text ist ein Fehler. */
export function optionaleZahlText(meldung = "Bitte eine Zahl eingeben oder leer lassen.") {
  return z.string().transform((text, ctx) => {
    if (!text.trim()) return null;
    const wert = zahlLesen(text);
    if (wert === null) {
      ctx.addIssue({ code: "custom", message: meldung });
      return z.NEVER;
    }
    return wert;
  });
}

/** Wert eines `datetime-local`-Felds als ISO-Zeitpunkt; leer ist ein Fehler. */
export function zeitpunktText(meldung = "Bitte Datum und Uhrzeit angeben.") {
  return z.string().transform((text, ctx) => {
    const iso = vonDatetimeLocal(text);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: meldung });
      return z.NEVER;
    }
    return iso;
  });
}

/** Wert eines `datetime-local`-Felds als ISO-Zeitpunkt; leer ergibt `undefined`. */
export function optionalerZeitpunktText(meldung = "Bitte ein gültiges Datum mit Uhrzeit angeben oder leer lassen.") {
  return z.string().transform((text, ctx) => {
    if (!text) return undefined;
    const iso = vonDatetimeLocal(text);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: meldung });
      return z.NEVER;
    }
    return iso;
  });
}

/** Fehlertext für einen abgelehnten Speichervorgang; zod-Fehler werden lesbar. */
export function fehlerText(fehler: unknown): string {
  if (fehler instanceof z.ZodError) return fehler.issues.map((i) => i.message).join(" ");
  return fehler instanceof Error ? fehler.message : String(fehler);
}
