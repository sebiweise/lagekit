/**
 * Cloudflare Worker mit dem Vermittlungsdienst für den Kurzcode.
 *
 * Alle Kurzcodes liegen in einem einzigen Durable Object („global“). Es läuft in einem
 * einzigen Prozess und speichert in seiner eigenen SQLite-Datenbank; das reicht für die
 * wenigen Anfragen weit aus und läuft im Free-Plan von Cloudflare. Weil es ein Prozess
 * ist, können Abfragen bis zu 25 Sekunden auf Neues warten (Long-Polling).
 *
 * Zwei Betriebsarten (siehe docs/betrieb/cloudflare.md):
 * - nur Kurzcode (cloudflare/wrangler.jsonc): Die App läuft woanders, z. B. auf Vercel,
 *   und ruft den Worker per CORS auf.
 * - App und Kurzcode (wrangler.jsonc im Wurzelordner): Der Worker liefert zusätzlich
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
import { vermittlungBeantworten } from "../src/core/sync/vermittlung-http";

interface Env {
  VERMITTLUNG: DurableObjectNamespace<Vermittlung>;
  /** Nur bei „App und Kurzcode“: statische Dateien aus `out/`. */
  ASSETS?: Fetcher;
  /** Für `/konfiguration.json`, Standard „selbst“ (Dienst dieses Workers). */
  LAGEKIT_KURZCODE_DIENST?: string;
}

const AUFRAEUMEN_MS = 60 * 60 * 1000;

export class Vermittlung extends DurableObject<Env> {
  private readonly speicher: Speicher;
  /** Long-Polling: Host und wartende Geräte bekommen Neues sofort, ohne ständig nachzufragen. */
  private readonly wartende = warteliste();
  private aufraeumenGeplant = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.speicher = schluesselSpeicher(ctx.storage.kv);
  }

  async vermitteln(eingabe: unknown, ip: string): Promise<Ergebnis> {
    const ergebnis = await vermitteln(this.speicher, eingabe, ip, this.wartende);
    if (!this.aufraeumenGeplant) {
      this.aufraeumenGeplant = true;
      if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + AUFRAEUMEN_MS);
    }
    return ergebnis;
  }

  /** Abgelaufene Kurzcodes und Anfragen löschen, solange noch etwas gespeichert ist. */
  async alarm(): Promise<void> {
    if (abgelaufeneLoeschen(this.ctx.storage.kv) > 0) await this.ctx.storage.setAlarm(Date.now() + AUFRAEUMEN_MS);
    else this.aufraeumenGeplant = false;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === DIENST_PFAD || pathname === DIENST_PFAD.slice(0, -1)) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unbekannt";
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
