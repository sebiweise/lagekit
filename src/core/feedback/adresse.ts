/**
 * Wohin das Feedback-Formular schickt (zentraler Feedback-Dienst, Cloudflare Worker).
 *
 * Gesteuert über die Umgebungsvariable `LAGEKIT_FEEDBACK_URL` beim Build:
 *
 * - nicht gesetzt oder `true`: gehosteter Dienst unter `https://feedback.sebiweise.workers.dev`,
 * - `false`: Formular aus, die App zeigt nur den Link zu GitHub,
 * - eine Adresse wie `https://feedback.example.de`: anderer Dienst mit demselben Vertrag
 *   (`/v1/feedback/lagekit` wird angehängt, falls er fehlt).
 *
 * Der Dienst nimmt nur Anfragen von freigegebenen Adressen an (GitHub Pages, lagekit.vercel.app).
 * Eigene Installationen bekommen 403 und schalten das Formular deshalb besser aus.
 *
 * Diese Datei hat keine Imports, weil scripts/build-info.mjs sie direkt lädt.
 */

/** Feedback-Dienst des Lagekit-Projekts. */
export const GEHOSTETER_FEEDBACK_DIENST = "https://feedback.sebiweise.workers.dev";
/** Projekt-ID beim Feedback-Dienst. */
export const FEEDBACK_PROJEKT = "lagekit";
const FEEDBACK_PFAD = `/v1/feedback/${FEEDBACK_PROJEKT}`;

const AN = new Set(["", "true", "1", "ja", "an", "on", "yes"]);
const AUS = new Set(["false", "0", "nein", "aus", "off", "no"]);

/**
 * Wert der Variable → Adresse des Endpunkts, oder `null`, wenn das Formular aus ist.
 * Wirft bei einem Wert, der weder Schalter noch Adresse ist, damit der Build scheitert.
 */
export function feedbackEndpunkt(wert: string | null | undefined): string | null {
  const roh = (wert ?? "").trim();
  const klein = roh.toLowerCase();
  if (AN.has(klein)) return GEHOSTETER_FEEDBACK_DIENST + FEEDBACK_PFAD;
  if (AUS.has(klein)) return null;
  let url: URL;
  try {
    url = new URL(roh);
  } catch {
    throw new Error(`LAGEKIT_FEEDBACK_URL: „${roh}“ ist weder true, false noch eine Adresse.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`LAGEKIT_FEEDBACK_URL: „${roh}“ muss mit https:// (oder http://) beginnen.`);
  }
  let pfad = url.pathname;
  while (pfad.endsWith("/")) pfad = pfad.slice(0, -1);
  return url.origin + (pfad.endsWith(FEEDBACK_PFAD) ? pfad : pfad + FEEDBACK_PFAD);
}
