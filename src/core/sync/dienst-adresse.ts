/**
 * Wohin der Kurzcode-Weg seine Anfragen schickt (Vermittlungsdienst).
 *
 * Gesteuert über die Umgebungsvariable `LAGEKIT_KURZCODE_DIENST`:
 *
 * - nicht gesetzt oder `true`: gehosteter Dienst des Lagekit-Projekts
 *   (statische Installationen und Docker ohne eigenen Server),
 * - `false`: Kurzcode aus, Beitritt nur per QR-Code oder Datei,
 * - `selbst`: Dienst derselben Installation unter `/api/vermittlung` (Vercel mit
 *   Upstash, Cloudflare Worker, Docker Compose mit Redis),
 * - eine Adresse wie `https://lagekit.example.de`: eigene Lagekit-Installation
 *   mit Vermittlungsdienst.
 *
 * Diese Datei hat keine Imports, weil scripts/build-info.mjs sie direkt lädt.
 */

/** Vermittlungsdienst des Lagekit-Projekts (Cloudflare Worker, siehe cloudflare/). */
export const GEHOSTETER_DIENST = "https://lagekit-kurzcode.sebiweise.workers.dev";
/**
 * Mit Schrägstrich am Ende: Vercel leitet sonst wegen `trailingSlash` um, und eine
 * Umleitung bricht die CORS-Vorabanfrage von fremden Installationen ab.
 */
export const DIENST_PFAD = "/api/vermittlung/";

const AN = new Set(["", "true", "1", "ja", "an", "on", "yes"]);
const AUS = new Set(["false", "0", "nein", "aus", "off", "no"]);
const SELBST = new Set(["selbst", "self", "eigen"]);

/**
 * Wert der Variable → Adresse des Endpunkts, oder `null`, wenn der Kurzcode aus ist.
 * Wirft bei einem Wert, der weder Schalter noch Adresse ist.
 */
export function dienstEndpunkt(wert: string | null | undefined): string | null {
  const roh = (wert ?? "").trim();
  const klein = roh.toLowerCase();
  if (AN.has(klein)) return GEHOSTETER_DIENST + DIENST_PFAD;
  if (AUS.has(klein)) return null;
  if (SELBST.has(klein)) return DIENST_PFAD;
  let url: URL;
  try {
    url = new URL(roh);
  } catch {
    throw new Error(`LAGEKIT_KURZCODE_DIENST: „${roh}“ ist weder true, false, selbst noch eine Adresse.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`LAGEKIT_KURZCODE_DIENST: „${roh}“ muss mit https:// (oder http://) beginnen.`);
  }
  const pfad = url.pathname.replace(/\/+$/, "");
  return url.origin + (pfad.endsWith("/api/vermittlung") ? `${pfad}/` : pfad + DIENST_PFAD);
}

/**
 * Wert beim Build: ohne Angabe nutzt ein Build auf Vercel mit verbundenem Upstash
 * seinen eigenen Dienst, alle anderen den gehosteten.
 */
export function dienstEndpunktBeimBuild(env: Record<string, string | undefined>): string | null {
  const wert = env.LAGEKIT_KURZCODE_DIENST;
  const upstash = (env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL) && (env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN);
  if ((wert === undefined || wert.trim() === "") && env.VERCEL && upstash) return DIENST_PFAD;
  return dienstEndpunkt(wert);
}
