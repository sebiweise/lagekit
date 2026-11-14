import { z } from "zod";

/**
 * Verbindungsdaten für WebRTC in kompakter Form.
 *
 * Ein vollständiges SDP ist für einen QR-Code unnötig groß. Für einen reinen
 * Datenkanal genügen ICE-Zugangsdaten, der Zertifikats-Fingerabdruck und die
 * Kandidaten (Adresse und Port). Daraus baut die Gegenseite ein gültiges SDP.
 */

export interface KompaktesSdp {
  /** ice-ufrag */
  u: string;
  /** ice-pwd */
  p: string;
  /** SHA-256-Fingerabdruck als Hex ohne Doppelpunkte */
  f: string;
  /** Kandidaten als [Adresse, Port] */
  k: [string, number][];
}

const kompaktSchema = z.object({
  u: z.string().min(1),
  p: z.string().min(1),
  f: z.string().regex(/^[0-9a-f]{64}$/),
  k: z.array(z.tuple([z.string().min(1), z.number().int().min(1).max(65535)])).max(8),
});

export class VerbindungscodeFehler extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VerbindungscodeFehler";
  }
}

/** Zieht die nötigen Teile aus einem SDP; nur UDP-Kandidaten, höchstens acht. */
export function sdpVerdichten(sdp: string): KompaktesSdp {
  const zeilen = sdp.split(/\r?\n/);
  const wert = (praefix: string) => zeilen.find((z) => z.startsWith(praefix))?.slice(praefix.length).trim();
  const u = wert("a=ice-ufrag:");
  const p = wert("a=ice-pwd:");
  const fp = wert("a=fingerprint:sha-256 ");
  if (!u || !p || !fp) throw new VerbindungscodeFehler("Die Verbindungsdaten sind unvollständig.");
  const k: [string, number][] = [];
  for (const zeile of zeilen) {
    if (!zeile.startsWith("a=candidate:")) continue;
    // a=candidate:<foundation> <component> <transport> <priority> <address> <port> typ <type> ...
    const teile = zeile.slice("a=candidate:".length).split(" ");
    if (teile[1] !== "1" || teile[2]?.toLowerCase() !== "udp") continue;
    const port = Number(teile[5]);
    if (!teile[4] || !Number.isInteger(port)) continue;
    if (!k.some(([a, pt]) => a === teile[4] && pt === port)) k.push([teile[4], port]);
    if (k.length === 8) break;
  }
  return { u, p, f: fp.replaceAll(":", "").toLowerCase(), k };
}

/** Baut aus den kompakten Daten ein SDP für `setRemoteDescription`. */
export function sdpAufbauen(daten: KompaktesSdp, art: "offer" | "answer"): string {
  const fingerprint = daten.f.match(/../g)!.join(":").toUpperCase();
  const kandidaten = daten.k.map(
    ([adresse, port], i) => `a=candidate:${i + 1} 1 udp ${2113937151 - i} ${adresse} ${port} typ host`,
  );
  return [
    "v=0",
    "o=- 0 2 IN IP4 127.0.0.1",
    "s=-",
    "t=0 0",
    "a=group:BUNDLE 0",
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    ...kandidaten,
    ...(kandidaten.length > 0 ? ["a=end-of-candidates"] : []),
    `a=ice-ufrag:${daten.u}`,
    `a=ice-pwd:${daten.p}`,
    `a=fingerprint:sha-256 ${fingerprint}`,
    // Wer anbietet, lässt die Rolle offen; wer antwortet, baut die DTLS-Verbindung auf.
    `a=setup:${art === "offer" ? "actpass" : "active"}`,
    "a=mid:0",
    "a=sctp-port:5000",
    "a=max-message-size:262144",
    "",
  ].join("\r\n");
}

async function komprimieren(text: string): Promise<Uint8Array> {
  const strom = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

async function entpacken(daten: Uint8Array): Promise<string> {
  const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(strom).text();
}

function base64url(bytes: Uint8Array): string {
  let binaer = "";
  for (const b of bytes) binaer += String.fromCharCode(b);
  return btoa(binaer).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function vonBase64url(text: string): Uint8Array {
  const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
  const binaer = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binaer, (c) => c.charCodeAt(0));
}

/**
 * Packt beliebige JSON-Daten in einen Code aus URL-sicheren Zeichen.
 * `praefix` kennzeichnet die Art (z. B. Anfrage oder Antwort) und schützt vor Verwechslung.
 */
export async function codeErstellen(praefix: string, daten: unknown): Promise<string> {
  return `${praefix}.${base64url(await komprimieren(JSON.stringify(daten)))}`;
}

export async function codeLesen<T>(praefix: string, code: string, schema: z.ZodType<T>): Promise<T> {
  const bereinigt = code.replace(/\s+/g, "");
  if (!bereinigt.startsWith(`${praefix}.`)) {
    throw new VerbindungscodeFehler("Das ist nicht der erwartete Lagekit-Code.");
  }
  let roh: unknown;
  try {
    roh = JSON.parse(await entpacken(vonBase64url(bereinigt.slice(praefix.length + 1))));
  } catch (cause) {
    throw new VerbindungscodeFehler("Der Code ist beschädigt oder unvollständig.", { cause });
  }
  const ergebnis = schema.safeParse(roh);
  if (!ergebnis.success) throw new VerbindungscodeFehler("Der Code enthält ungültige Daten.");
  return ergebnis.data;
}

export { kompaktSchema };
