"use client";

import { useEffect, useState } from "react";
import { dienstEndpunkt } from "./dienst-adresse";

/**
 * Vermittlungsdienst dieser Installation zur Laufzeit.
 *
 * Grundlage ist der Wert aus dem Build (`LAGEKIT_KURZCODE_DIENST`). Liegt neben der
 * App eine `/konfiguration.json` mit `{"kurzcodeDienst": "…"}`, gilt deren Wert.
 * Das Docker-Image erzeugt diese Datei beim Start aus der Umgebungsvariable,
 * so lässt sich der Dienst ohne neuen Build umstellen.
 */
export interface KurzcodeDienst {
  /** Adresse des Endpunkts, relativ (eigener Dienst) oder absolut. */
  endpunkt: string;
  /** Rechnername des Diensts, z. B. `lagekit.vercel.app`. */
  host: string;
  /** Läuft der Dienst unter einer anderen Adresse als diese Installation? */
  fremd: boolean;
}

const AUS_DEM_BUILD = process.env.NEXT_PUBLIC_KURZCODE_DIENST || null;

let geladen: Promise<KurzcodeDienst | null> | null = null;

async function endpunktLaden(): Promise<string | null> {
  try {
    const antwort = await fetch("/konfiguration.json", { cache: "no-store", signal: AbortSignal.timeout(3_000) });
    if (antwort.ok && antwort.headers.get("content-type")?.includes("json")) {
      const konfiguration = (await antwort.json()) as { kurzcodeDienst?: unknown };
      if (typeof konfiguration.kurzcodeDienst === "string") return dienstEndpunkt(konfiguration.kurzcodeDienst);
    }
  } catch (e) {
    // Offline, keine Datei oder ungültiger Wert: Wert aus dem Build.
    if (e instanceof Error && e.message.startsWith("LAGEKIT_")) console.warn(e.message);
  }
  return AUS_DEM_BUILD;
}

function beschreiben(endpunkt: string | null): KurzcodeDienst | null {
  if (!endpunkt) return null;
  const url = new URL(endpunkt, location.href);
  return { endpunkt, host: url.host, fremd: url.origin !== location.origin };
}

/** Einmal pro Seitenaufruf ermittelt; `null` heißt: Kurzcode ist in dieser Installation aus. */
export function kurzcodeDienst(): Promise<KurzcodeDienst | null> {
  geladen ??= endpunktLaden().then(beschreiben);
  return geladen;
}

/** `undefined`, solange die Konfiguration lädt. */
export function useKurzcodeDienst(): KurzcodeDienst | null | undefined {
  const [dienst, setDienst] = useState<KurzcodeDienst | null | undefined>(undefined);
  useEffect(() => {
    let aktiv = true;
    void kurzcodeDienst().then((d) => aktiv && setDienst(d));
    return () => {
      aktiv = false;
    };
  }, []);
  return dienst;
}
