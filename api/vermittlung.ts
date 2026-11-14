/**
 * Vercel-Funktion für den Kurzcode-Weg. Braucht Upstash Redis
 * (Vercel-Marketplace); die Zugangsdaten kommen aus den Umgebungsvariablen.
 */
import { upstashSpeicher, vermitteln } from "../src/core/sync/vermittlung-dienst";

const MAX_GROESSE = 8_000;

export async function POST(request: Request): Promise<Response> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return Response.json({ fehler: "Der Vermittlungsdienst ist nicht eingerichtet." }, { status: 503 });
  }
  const text = await request.text();
  if (text.length > MAX_GROESSE) return Response.json({ fehler: "Anfrage zu groß." }, { status: 413 });
  let eingabe: unknown;
  try {
    eingabe = JSON.parse(text);
  } catch {
    return Response.json({ fehler: "Ungültige Anfrage." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  try {
    const { status, inhalt } = await vermitteln(upstashSpeicher(url, token), eingabe, ip);
    return Response.json(inhalt, { status, headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("Vermittlung fehlgeschlagen", e);
    return Response.json({ fehler: "Der Vermittlungsdienst ist gerade gestört." }, { status: 502 });
  }
}
