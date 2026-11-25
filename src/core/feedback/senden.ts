import { z } from "zod";
import "@/lib/formular";
import { t } from "@/i18n";

/**
 * Feedback an den zentralen Feedback-Dienst (Vertrag im Repository feedback-worker).
 *
 * Gesendet wird nur, was im Formular steht: Art, Text, freiwillig eine E-Mail-Adresse und,
 * wenn angehakt, Version und Plattform. Nie Einsatzdaten, nie die aufgerufene Seite.
 */

/** Endpunkt aus dem Build (`LAGEKIT_FEEDBACK_URL`); `null` heißt: Formular aus. */
export const FEEDBACK_ENDPUNKT = process.env.NEXT_PUBLIC_FEEDBACK_URL || null;

export const FEEDBACK_ARTEN = ["bug", "wish", "other"] as const;
export type FeedbackArt = (typeof FEEDBACK_ARTEN)[number];

/** Grenzen des Diensts; er zählt selbst nach und meldet Abweichungen mit eigenem Text. */
export const NACHRICHT_MIN = 10;
export const NACHRICHT_MAX = 4000;

export const feedbackFormularSchema = z.object({
  art: z.enum(FEEDBACK_ARTEN),
  nachricht: z
    .string()
    .trim()
    .min(NACHRICHT_MIN, t.feedback.zuKurz(NACHRICHT_MIN))
    .max(NACHRICHT_MAX, t.feedback.zuLang(NACHRICHT_MAX)),
  email: z.union([z.literal(""), z.email(t.feedback.emailUngueltig)]),
  diagnose: z.boolean(),
  /** Unsichtbares Feld gegen Bots; Menschen lassen es leer. */
  website: z.string(),
});

export type FeedbackFormularWerte = z.input<typeof feedbackFormularSchema>;
export type FeedbackEingabe = z.output<typeof feedbackFormularSchema>;

export interface Diagnose {
  appVersion: string;
  platform: string;
}

export type SendeErgebnis = { ok: true } | { ok: false; fehler: string; code: string };

/** Anfrage-Body nach dem Vertrag des Diensts. */
export function feedbackBody(eingabe: FeedbackEingabe, diagnose: Diagnose) {
  return {
    kind: eingabe.art,
    message: eingabe.nachricht,
    ...(eingabe.email ? { email: eingabe.email } : {}),
    source: "web",
    ...(eingabe.diagnose ? { diagnostics: diagnose } : {}),
    website: eingabe.website,
  };
}

const PLATTFORMEN: [string, string][] = [
  ["iphone", "iOS"],
  ["ipad", "iPadOS"],
  ["android", "Android"],
  ["cros", "ChromeOS"],
  ["chrome os", "ChromeOS"],
  ["windows", "Windows"],
  ["mac os", "macOS"],
  ["linux", "Linux"],
];

/**
 * Grobe Plattform aus dem Browser, z. B. „Windows, Browser“ oder „iOS, installierte App“.
 * Nur aus einer festen Liste, damit nicht die ganze Browser-Kennung mitgeht.
 */
export function plattform(ua: string, hinweis: string | undefined, installiert: boolean): string {
  const klein = `${hinweis ?? ""} ${ua}`.toLowerCase();
  const name = PLATTFORMEN.find(([merkmal]) => klein.includes(merkmal))?.[1] ?? "unbekannt";
  return `${name}, ${installiert ? "installierte App" : "Browser"}`;
}

/** Text zu einem Fehler ohne Antwort des Diensts. */
function ohneAntwort(code: string): SendeErgebnis {
  return { ok: false, code, fehler: code === "offline" ? t.feedback.offline : t.feedback.nichtErreichbar };
}

/**
 * Schickt das Feedback. Offline geht gar keine Anfrage raus. Der Dienst liefert Fehlertexte
 * auf Deutsch (Accept-Language), die die App so anzeigt.
 */
export async function feedbackSenden(
  endpunkt: string,
  body: ReturnType<typeof feedbackBody>,
  optionen: { online?: boolean; fetch?: typeof fetch } = {},
): Promise<SendeErgebnis> {
  if (optionen.online === false) return ohneAntwort("offline");
  const abrufen = optionen.fetch ?? fetch;
  let antwort: Response;
  try {
    antwort = await abrufen(endpunkt, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": "de" },
      body: JSON.stringify(body),
      // Keine Cookies, kein Referrer: Der Dienst braucht nur den Text.
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return ohneAntwort("netz");
  }
  let inhalt: unknown = null;
  try {
    inhalt = await antwort.json();
  } catch {
    // Kein JSON, etwa eine Fehlerseite eines Proxys.
  }
  const daten = (inhalt ?? {}) as { ok?: unknown; error?: unknown; code?: unknown };
  if (antwort.ok && daten.ok === true) return { ok: true };
  const code = typeof daten.code === "string" ? daten.code : `http${antwort.status}`;
  const fehler = typeof daten.error === "string" && daten.error.trim() ? daten.error : t.feedback.fehler(antwort.status);
  return { ok: false, code, fehler };
}
