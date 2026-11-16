/**
 * Cloudflare Worker mit dem Vermittlungsdienst für den Kurzcode.
 *
 * Alle Kurzcodes liegen in einem einzigen Durable Object („global“). Es läuft in einem
 * einzigen Prozess und speichert in seiner eigenen SQLite-Datenbank; das reicht für die
 * wenigen Anfragen weit aus und läuft im Free-Plan von Cloudflare. Weil es ein Prozess
 * ist, können Abfragen bis zu 25 Sekunden auf Neues warten (Long-Polling). Ein Alarm
 * löscht jeden Eintrag zu seiner Ablaufzeit.
 *
 * Zwei Betriebsarten (siehe docs/betrieb/cloudflare.md):
 * - nur Kurzcode (wrangler.jsonc im Wurzelordner): Die App läuft woanders, z. B. auf Vercel,
 *   und ruft den Worker per CORS auf.
 * - App und Kurzcode (cloudflare/wrangler.app.jsonc): Der Worker liefert zusätzlich
 *   den statischen Export aus `out/` aus.
 */
import { DurableObject } from "cloudflare:workers";
import { DIENST_PFAD } from "../src/core/sync/dienst-adresse";
import {
  abgelaufeneLoeschen,
  schluesselSpeicher,
  vermitteln,
  warteliste,
  type Ergebnis,
  type Speicher,
} from "../src/core/sync/vermittlung-dienst";
import { json, vermittlungBeantworten } from "../src/core/sync/vermittlung-http";

interface Env {
  VERMITTLUNG: DurableObjectNamespace<Vermittlung>;
  /** Nur bei „App und Kurzcode“: statische Dateien aus `out/`. */
  ASSETS?: Fetcher;
  /**
   * Grenze pro IP-Adresse vor dem Durable Object (Rate Limiting von Cloudflare). Wer
   * sie überschreitet, bekommt 429, ohne dass das Durable Object etwas tun muss.
   */
  GRENZE?: RateLimit;
  /** Für `/konfiguration.json`, Standard „selbst“ (Dienst dieses Workers). */
  LAGEKIT_KURZCODE_DIENST?: string;
}

export class Vermittlung extends DurableObject<Env> {
  private readonly speicher: Speicher;
  /** Long-Polling: Host und wartende Geräte bekommen Neues sofort, ohne ständig nachzufragen. */
  private readonly wartende = warteliste();
  /** Zeitpunkt des geplanten Löschens (Alarm), `undefined` = noch nicht gelesen. */
  private alarmUm: number | null | undefined;
  /** Früheste neue Ablaufzeit seit dem letzten Abgleich mit dem Alarm. */
  private frueheste: number | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.speicher = schluesselSpeicher(ctx.storage.kv, Date.now, (bis) => {
      this.frueheste = this.frueheste === null ? bis : Math.min(this.frueheste, bis);
    });
  }

  async vermitteln(eingabe: unknown, ip: string): Promise<Ergebnis> {
    const ergebnis = await vermitteln(this.speicher, eingabe, ip, this.wartende);
    await this.alarmPlanen();
    return ergebnis;
  }

  /** Alarm auf den frühesten Ablauf legen, damit nichts länger als nötig liegen bleibt. */
  private async alarmPlanen(): Promise<void> {
    if (this.frueheste === null) return;
    const bis = this.frueheste;
    this.frueheste = null;
    if (this.alarmUm === undefined) this.alarmUm = await this.ctx.storage.getAlarm();
    if (this.alarmUm === null || bis < this.alarmUm) {
      this.alarmUm = bis;
      await this.ctx.storage.setAlarm(bis);
    }
  }

  /** Abgelaufene Kurzcodes und Anfragen löschen und den Alarm auf den nächsten Ablauf legen. */
  async alarm(): Promise<void> {
    const naechste = abgelaufeneLoeschen(this.ctx.storage.kv);
    this.alarmUm = naechste;
    if (naechste !== null) await this.ctx.storage.setAlarm(naechste);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === DIENST_PFAD || pathname === DIENST_PFAD.slice(0, -1)) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unbekannt";
      if (request.method === "POST" && env.GRENZE && !(await env.GRENZE.limit({ key: ip })).success) {
        return json({ fehler: "Zu viele Anfragen. Bitte kurz warten." }, 429);
      }
      const dienst = env.VERMITTLUNG.getByName("global");
      return vermittlungBeantworten(request, ip, (eingabe, ip) => dienst.vermitteln(eingabe, ip));
    }
    if (pathname === "/konfiguration.json") {
      return Response.json(
        { kurzcodeDienst: env.LAGEKIT_KURZCODE_DIENST ?? "selbst" },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Lagekit-Kurzcode-Dienst. Die App ruft ihn unter /api/vermittlung/ auf.\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
} satisfies ExportedHandler<Env>;
