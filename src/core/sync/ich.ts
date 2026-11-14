import type { LagekitDB } from "@/core/db/db";
import { teilnehmerSchema, type Teilnehmer } from "./protokoll";

const SCHLUESSEL = "sync.ich";

/** Kurzbeschreibung des Geräts aus dem User-Agent, z. B. „iPhone · Safari“. */
export function geraetBeschreiben(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const system = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "Gerät";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\/|FxiOS/.test(ua)
      ? "Firefox"
      : /Chrome\/|CriOS/.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${system} · ${browser}`;
}

/** Eigene Angaben für Sitzungen; die Geräte-Id bleibt dauerhaft gleich. */
export async function ichLesen(db: LagekitDB): Promise<Teilnehmer> {
  const gespeichert = (await db.einstellungen.get(SCHLUESSEL))?.wert as Partial<Teilnehmer> | undefined;
  return {
    geraetId: gespeichert?.geraetId ?? crypto.randomUUID(),
    name: gespeichert?.name ?? "",
    funktion: gespeichert?.funktion ?? "",
    fahrzeug: gespeichert?.fahrzeug ?? "",
    geraet: geraetBeschreiben(),
  };
}

export async function ichSpeichern(db: LagekitDB, ich: Teilnehmer): Promise<Teilnehmer> {
  const geprueft = teilnehmerSchema.parse({ ...ich, geraet: geraetBeschreiben() });
  await db.einstellungen.put({ schluessel: SCHLUESSEL, wert: geprueft });
  return geprueft;
}
