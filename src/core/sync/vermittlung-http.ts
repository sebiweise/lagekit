/**
 * HTTP-Hülle des Vermittlungsdiensts, gleich für Cloudflare Worker, Node-Server
 * und Vercel-Funktion: Größenbegrenzung, JSON, CORS und Fehlertexte.
 *
 * Statische Installationen und Docker-Images ohne eigenen Dienst rufen ihn von ihrer
 * eigenen Adresse aus auf, daher CORS für alle Ursprünge. Cookies oder andere
 * Zugangsdaten gibt es nicht; geschützt wird über Kurzcode, Schlüssel und die
 * Begrenzung pro IP-Adresse. Diese Datei nutzt nur Web-Standards (Request, Response).
 */
import type { Ergebnis } from "./vermittlung-dienst.js";

const MAX_GROESSE = 8_000;

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export function json(inhalt: unknown, status: number): Response {
  return Response.json(inhalt, { status, headers: { ...CORS, "cache-control": "no-store" } });
}

/** Beantwortet eine Anfrage an `/api/vermittlung/`; `vermitteln` führt die Aktion aus. */
export async function vermittlungBeantworten(
  request: Request,
  ip: string,
  vermitteln: (eingabe: unknown, ip: string) => Promise<Ergebnis>,
): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return json({ fehler: "Nur POST." }, 405);
  const text = await request.text();
  if (text.length > MAX_GROESSE) return json({ fehler: "Anfrage zu groß." }, 413);
  let eingabe: unknown;
  try {
    eingabe = JSON.parse(text);
  } catch {
    return json({ fehler: "Ungültige Anfrage." }, 400);
  }
  try {
    const { status, inhalt } = await vermitteln(eingabe, ip);
    return json(inhalt, status);
  } catch (e) {
    console.error("Vermittlung fehlgeschlagen", e);
    return json({ fehler: "Der Vermittlungsdienst ist gerade gestört." }, 502);
  }
}
