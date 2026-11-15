/**
 * Vercel-Funktion für den Kurzcode-Weg. Braucht Upstash Redis
 * (Vercel-Marketplace); die Zugangsdaten kommen aus den Umgebungsvariablen.
 *
 * Statische Installationen und Docker-Images ohne eigenen Server rufen den Dienst
 * von ihrer eigenen Adresse aus auf, daher CORS für alle Ursprünge. Cookies oder
 * andere Zugangsdaten gibt es nicht; geschützt wird über Kurzcode, Schlüssel und
 * die Begrenzung pro IP-Adresse.
 */
import { upstashSpeicher, vermitteln } from "../src/core/sync/vermittlung-dienst.js";

const MAX_GROESSE = 8_000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function json(inhalt: unknown, status: number): Response {
  return Response.json(inhalt, { status, headers: { ...CORS, "cache-control": "no-store" } });
}

/** Vorabanfrage des Browsers bei Aufrufen von einer anderen Adresse. */
export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return json({ fehler: "Der Vermittlungsdienst ist nicht eingerichtet." }, 503);
  }
  const text = await request.text();
  if (text.length > MAX_GROESSE) return json({ fehler: "Anfrage zu groß." }, 413);
  let eingabe: unknown;
  try {
    eingabe = JSON.parse(text);
  } catch {
    return json({ fehler: "Ungültige Anfrage." }, 400);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  try {
    const { status, inhalt } = await vermitteln(upstashSpeicher(url, token), eingabe, ip);
    return json(inhalt, status);
  } catch (e) {
    console.error("Vermittlung fehlgeschlagen", e);
    return json({ fehler: "Der Vermittlungsdienst ist gerade gestört." }, 502);
  }
}
