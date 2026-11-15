"use client";

import { useEffect, useSyncExternalStore } from "react";
import { istVersionInfo, VERSION_INFO_ANFRAGE, type VersionInfo } from "@/core/aenderungen/version-info";
import { activateWaitingWorker, registerServiceWorker, serviceWorkerSupported } from "./register";

export type OfflineStatus = "pruefen" | "bereit" | "nicht-verfuegbar" | "entwicklung";

export interface PwaZustand {
  offline: OfflineStatus;
  /** Eine neue Version ist installiert und wartet auf Bestätigung. */
  updateWartet: boolean;
  /** Angaben der wartenden Version; `null`, solange unbekannt oder nicht lieferbar. */
  neueVersion: VersionInfo | null;
  /** Abfrage beim wartenden Worker ist abgeschlossen (mit oder ohne Ergebnis). */
  neueVersionGeladen: boolean;
  /** „Jetzt aktualisieren“ wurde gedrückt; die Seite lädt gleich neu. */
  wirdAktualisiert: boolean;
}

const START: PwaZustand = {
  offline: "pruefen",
  updateWartet: false,
  neueVersion: null,
  neueVersionGeladen: false,
  wirdAktualisiert: false,
};

/** Wie oft eine offene App nach einer neuen Version fragt. */
const PRUEF_INTERVALL_MS = 60 * 60 * 1000;
const INFO_TIMEOUT_MS = 3000;

let zustand = START;
let registration: ServiceWorkerRegistration | null = null;
let gestartet = false;
const hoerer = new Set<() => void>();

function setzen(teil: Partial<PwaZustand>) {
  zustand = { ...zustand, ...teil };
  for (const h of hoerer) h();
}

/** Fragt einen Service Worker nach seiner Version; ältere Worker antworten nicht. */
function versionInfoAbfragen(worker: ServiceWorker): Promise<VersionInfo | null> {
  return new Promise((resolve) => {
    const kanal = new MessageChannel();
    const timer = setTimeout(() => resolve(null), INFO_TIMEOUT_MS);
    kanal.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(istVersionInfo(event.data) ? event.data : null);
    };
    worker.postMessage({ type: VERSION_INFO_ANFRAGE }, [kanal.port2]);
  });
}

let abgefragterWorker: ServiceWorker | null = null;

function wartendPruefen(reg: ServiceWorkerRegistration) {
  // Nur ein Update, wenn bereits eine Version die Seite steuert.
  const wartend = navigator.serviceWorker.controller ? reg.waiting : null;
  if (!wartend) {
    if (zustand.updateWartet) setzen({ updateWartet: false, neueVersion: null, neueVersionGeladen: false });
    return;
  }
  if (wartend === abgefragterWorker) return;
  abgefragterWorker = wartend;
  setzen({ updateWartet: true, neueVersion: null, neueVersionGeladen: false });
  void versionInfoAbfragen(wartend).then((info) => {
    if (abgefragterWorker === wartend) setzen({ neueVersion: info, neueVersionGeladen: true });
  });
}

/** Registriert den Service Worker einmal je Seite und beobachtet Updates. */
export function pwaStarten(): void {
  if (gestartet || typeof window === "undefined") return;
  gestartet = true;

  if (!serviceWorkerSupported()) {
    setzen({ offline: "nicht-verfuegbar" });
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    setzen({ offline: "entwicklung" });
    return;
  }

  // Wechselt die steuernde Version (in diesem oder einem anderen Tab bestätigt),
  // laden alle Tabs neu. So läuft nie alter Code gegen die umgebaute Datenbank.
  // Der erste Wechsel nach der Erstinstallation (clientsClaim) ist kein Update.
  let hatteController = Boolean(navigator.serviceWorker.controller);
  let laedtNeu = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hatteController) {
      hatteController = true;
      return;
    }
    if (laedtNeu) return;
    laedtNeu = true;
    window.location.reload();
  });

  registerServiceWorker()
    .then((reg) => {
      if (!reg) return;
      registration = reg;
      wartendPruefen(reg);
      reg.addEventListener("updatefound", () => {
        const neu = reg.installing;
        neu?.addEventListener("statechange", () => {
          if (neu.state === "installed") wartendPruefen(reg);
        });
      });
      const pruefen = () => {
        if (navigator.onLine) reg.update().catch(() => undefined);
      };
      setInterval(pruefen, PRUEF_INTERVALL_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") pruefen();
      });
      return navigator.serviceWorker.ready;
    })
    .then((reg) => {
      if (reg) setzen({ offline: "bereit" });
    })
    .catch(() => setzen({ offline: "nicht-verfuegbar" }));
}

/** Aktiviert die wartende Version; alle offenen Tabs laden danach neu. */
export function updateAktivieren(): void {
  if (!registration?.waiting) return;
  setzen({ wirdAktualisiert: true });
  activateWaitingWorker(registration);
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Für Code außerhalb von React, z. B. Benachrichtigungen. */
export const pwa = {
  abonnieren,
  zustand: () => zustand,
};

/** Zustand von Service Worker und Update; startet die Registrierung bei Bedarf. */
export function usePwaZustand(): PwaZustand {
  useEffect(pwaStarten, []);
  return useSyncExternalStore(
    abonnieren,
    () => zustand,
    () => START,
  );
}
