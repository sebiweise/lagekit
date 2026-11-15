"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { aufloesen, FARBSCHEMA_SCHLUESSEL, istFarbschema, type Farbschema } from "./farbschema";

const SYSTEM_DUNKEL = "(prefers-color-scheme: dark)";
const zuhoerer = new Set<() => void>();

function lesen(): Farbschema {
  try {
    const wert = localStorage.getItem(FARBSCHEMA_SCHLUESSEL);
    return istFarbschema(wert) ? wert : "system";
  } catch {
    return "system";
  }
}

function anwenden(wahl: Farbschema) {
  const dunkel = aufloesen(wahl, window.matchMedia(SYSTEM_DUNKEL).matches) === "dark";
  const klassen = document.documentElement.classList;
  klassen.toggle("dark", dunkel);
  klassen.toggle("light", !dunkel);
}

function abonnieren(neu: () => void) {
  zuhoerer.add(neu);
  // Wahl in einem anderen Tab geändert.
  const beiSpeicher = (e: StorageEvent) => {
    if (e.key === FARBSCHEMA_SCHLUESSEL) neu();
  };
  window.addEventListener("storage", beiSpeicher);
  return () => {
    zuhoerer.delete(neu);
    window.removeEventListener("storage", beiSpeicher);
  };
}

/** Gewählte Darstellung und Umschalter; die Klasse am <html> wird mitgeführt. */
export function useFarbschema() {
  const wahl = useSyncExternalStore(abonnieren, lesen, () => "system" as const);

  useEffect(() => {
    anwenden(wahl);
    if (wahl !== "system") return;
    // Systemwechsel (z. B. automatischer Dunkelmodus abends) sofort übernehmen.
    const mq = window.matchMedia(SYSTEM_DUNKEL);
    const beiWechsel = () => anwenden("system");
    mq.addEventListener("change", beiWechsel);
    return () => mq.removeEventListener("change", beiWechsel);
  }, [wahl]);

  const setzen = useCallback((neu: Farbschema) => {
    try {
      if (neu === "system") localStorage.removeItem(FARBSCHEMA_SCHLUESSEL);
      else localStorage.setItem(FARBSCHEMA_SCHLUESSEL, neu);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
    }
    anwenden(neu);
    zuhoerer.forEach((f) => f());
  }, []);

  return { wahl, setzen };
}
