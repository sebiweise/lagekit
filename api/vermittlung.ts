/**
 * Vercel-Funktion für den Kurzcode-Weg.
 *
 * - Mit Upstash Redis (Vercel-Marketplace) vermittelt sie selbst; die Zugangsdaten
 *   kommen aus den Umgebungsvariablen.
 * - Ohne Upstash, aber mit `LAGEKIT_KURZCODE_DIENST` auf einen anderen Dienst (z. B.
 *   einen Cloudflare Worker), reicht sie Anfragen dorthin weiter. So funktionieren
 *   ältere Installationen weiter, die noch diese Adresse ansprechen.
 */
import { dienstEndpunkt } from "../src/core/sync/dienst-adresse.js";
import { upstashSpeicher, vermitteln } from "../src/core/sync/vermittlung-dienst.js";
import { CORS, json, vermittlungBeantworten } from "../src/core/sync/vermittlung-http.js";

/** Ziel für die Weiterleitung, wenn hier kein Speicher eingerichtet ist. */
function weiterleitungsZiel(request: Request): string | null {
  try {
    const ziel = dienstEndpunkt(process.env.LAGEKIT_KURZCODE_DIENST);
    if (!ziel || !/^https?:/.test(ziel)) return null;
    return new URL(ziel).host === new URL(request.url).host ? null : ziel;
  } catch {
    return null;
  }
}

async function bearbeiten(request: Request): Promise<Response> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
    return vermittlungBeantworten(request, ip, (eingabe, ip) => vermitteln(upstashSpeicher(url, token), eingabe, ip));
  }
  const ziel = weiterleitungsZiel(request);
  if (!ziel) return json({ fehler: "Der Vermittlungsdienst ist nicht eingerichtet." }, 503);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const antwort = await fetch(ziel, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
    return json(await antwort.json(), antwort.status);
  } catch (e) {
    console.error("Weiterleitung fehlgeschlagen", e);
    return json({ fehler: "Der Vermittlungsdienst ist gerade gestört." }, 502);
  }
}

/** Vorabanfrage des Browsers bei Aufrufen von einer anderen Adresse. */
export const OPTIONS = bearbeiten;
export const POST = bearbeiten;
