/**
 * Vermittlungsdienst für den Kurzcode als kleiner Node-Server, z. B. neben Redis in
 * Docker Compose (siehe compose.yaml und docs/betrieb/docker.md).
 *
 * Umgebungsvariablen:
 * - `REDIS_URL`: z. B. `redis://redis:6379`. Ohne Angabe liegen die Kurzcodes im
 *   Arbeitsspeicher und sind nach einem Neustart weg.
 * - `PORT`: Standard 8787.
 *
 * Genau ein Prozess je Redis, sonst weckt eine Beitrittsanfrage den wartenden Host
 * nicht sofort (er bekommt sie dann erst bei der nächsten Abfrage).
 *
 * Läuft hinter dem nginx des Lagekit-Images, das `/api/vermittlung/` hierher
 * weiterreicht. Die IP-Adresse des Geräts kommt aus `X-Forwarded-For`.
 */
import { createServer, type IncomingMessage } from "node:http";
import { createClient } from "redis";
import { DIENST_PFAD } from "../src/core/sync/dienst-adresse";
import {
  redisSpeicher,
  speicherImArbeitsspeicher,
  vermitteln,
  warteliste,
  type Speicher,
} from "../src/core/sync/vermittlung-dienst";
import { json, vermittlungBeantworten } from "../src/core/sync/vermittlung-http";

const port = Number(process.env.PORT ?? 8787);

async function speicherOeffnen(): Promise<Speicher> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL fehlt: Kurzcodes liegen nur im Arbeitsspeicher.");
    return speicherImArbeitsspeicher();
  }
  const client = createClient({ url });
  client.on("error", (e: unknown) => console.error("Redis:", e));
  await client.connect();
  console.log("Redis verbunden.");
  return redisSpeicher({
    befehl: async <T>(b: (string | number)[]) => (await client.sendCommand(b.map(String))) as T,
    transaktion: async (befehle) => {
      const multi = client.multi();
      for (const b of befehle) multi.addCommand(b.map(String));
      return (await multi.exec()) as unknown[];
    },
  });
}

/** Node-Anfrage → Web-Request (für die gemeinsame HTTP-Hülle). */
async function alsRequest(req: IncomingMessage): Promise<Request> {
  const teile: Buffer[] = [];
  let groesse = 0;
  for await (const teil of req) {
    groesse += (teil as Buffer).length;
    // Mehr als die erlaubte Größe muss nicht gelesen werden; die Hülle lehnt ab.
    if (groesse > 16_000) break;
    teile.push(teil as Buffer);
  }
  const hatInhalt = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
  return new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, {
    method: req.method,
    headers: { "content-type": String(req.headers["content-type"] ?? "") },
    body: hatInhalt ? Buffer.concat(teile) : undefined,
  });
}

const speicher = await speicherOeffnen();
/** Long-Polling; geht, weil genau ein Prozess die Anfragen beantwortet. */
const wartende = warteliste();

createServer(async (req, res) => {
  const pfad = (req.url ?? "/").split("?")[0];
  let antwort: Response;
  if (pfad === "/gesund") {
    antwort = new Response("ok");
  } else if (pfad === DIENST_PFAD || pfad === DIENST_PFAD.slice(0, -1)) {
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unbekannt").split(",")[0].trim();
    antwort = await vermittlungBeantworten(await alsRequest(req), ip, (eingabe, ip) => vermitteln(speicher, eingabe, ip, wartende));
  } else {
    antwort = json({ fehler: "Unbekannte Adresse." }, 404);
  }
  res.writeHead(antwort.status, Object.fromEntries(antwort.headers));
  res.end(Buffer.from(await antwort.arrayBuffer()));
}).listen(port, () => console.log(`Kurzcode-Dienst auf Port ${port}, Pfad ${DIENST_PFAD}`));
