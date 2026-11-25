/**
 * Wohin das Feedback-Formular schickt (zentraler Feedback-Dienst, Cloudflare Worker).
 *
 * Gesteuert über die Umgebungsvariable `LAGEKIT_FEEDBACK_URL` beim Build:
 *
 * - `true`: gehosteter Dienst unter `https://feedback.sebiweise.workers.dev`,
 * - `false`: Formular aus, die App zeigt nur den Link zu GitHub,
 * - eine Adresse wie `https://feedback.example.de`: anderer Dienst mit demselben Vertrag
 *   (`/v1/feedback/lagekit` wird angehängt, falls er fehlt),
 * - nicht gesetzt: aus, außer beim Produktions-Build des Projekts auf Vercel (lagekit.vercel.app).
 *
 * Der Dienst nimmt nur Anfragen von den Adressen des Projekts an (sebiweise.github.io,
 * lagekit.vercel.app). Forks, Vorschau-Deployments und eigene Installationen bekämen 403;
 * deshalb ist das Formular dort ohne ausdrückliches `true` aus.
 *
 * Diese Datei hat keine Imports, weil scripts/build-info.mjs sie direkt lädt.
 */

/** Feedback-Dienst des Lagekit-Projekts. */
export const GEHOSTETER_FEEDBACK_DIENST = "https://feedback.sebiweise.workers.dev";
/** Projekt-ID beim Feedback-Dienst. */
export const FEEDBACK_PROJEKT = "lagekit";
const FEEDBACK_PFAD = `/v1/feedback/${FEEDBACK_PROJEKT}`;

const AN = new Set(["true", "1", "ja", "an", "on", "yes"]);
const AUS = new Set(["", "false", "0", "nein", "aus", "off", "no"]);

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

/** Produktionsadresse des Projekts auf Vercel; dort ist das Formular ohne Angabe an. */
export const PROJEKT_VERCEL_ADRESSE = "lagekit.vercel.app";

/**
 * Wert beim Build: Ohne Angabe ist das Formular nur im Produktions-Build des Projekts auf Vercel
 * an, weil der Dienst nur dessen Adresse freigibt. GitHub Pages setzt den Wert im Workflow.
 */
export function feedbackEndpunktBeimBuild(env: Record<string, string | undefined>): string | null {
  const wert = env.LAGEKIT_FEEDBACK_URL;
  if (wert === undefined || wert.trim() === "") {
    const projektBuild = env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL === PROJEKT_VERCEL_ADRESSE;
    return projektBuild ? feedbackEndpunkt("true") : null;
  }
  return feedbackEndpunkt(wert);
}
