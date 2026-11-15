/// <reference lib="webworker" />
/**
 * Service Worker von Lagekit.
 *
 * Wird nach `next build` von `scripts/build-sw.mjs` gebündelt; dabei wird
 * `self.__SW_MANIFEST` durch die Liste aller Dateien in `out/` ersetzt.
 * Alles wird vorab gecacht, damit die App nach dem ersten Laden ohne Netz läuft.
 *
 * Updates: Ein neuer Service Worker bleibt im Zustand "waiting", bis die App
 * nach Bestätigung durch den Nutzer die Nachricht `SKIP_WAITING` schickt.
 * So wechselt die Version nie mitten im Einsatz.
 *
 * Vorher fragt die laufende App per `VERSION_INFO` nach Version, Änderungen
 * und Datenbank-Umbauten dieses Workers, um sie vor dem Update anzuzeigen.
 */
import { Serwist, type PrecacheEntry } from "serwist";
import { AKTUELLE_VERSION } from "@/core/aenderungen/aktuell";
import { VERSION_INFO_ANFRAGE } from "@/core/aenderungen/version-info";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    // Next.js hängt bei Client-Navigation `?_rsc=…` an die RSC-Payload-Anfragen.
    ignoreURLParametersMatching: [/^_rsc$/, /^utm_/],
    // `/hinweise` (ohne Schrägstrich) auf `/hinweise/index.html` abbilden.
    urlManipulation: ({ url }) =>
      url.pathname.endsWith("/") || url.pathname.includes(".")
        ? []
        : [new URL(`${url.pathname}/index.html`, url.origin)],
    // Unbekannte Adressen zeigen offline die 404-Seite statt eines Browserfehlers.
    navigateFallback: "/404.html",
  },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  } else if (event.data?.type === VERSION_INFO_ANFRAGE) {
    event.ports[0]?.postMessage(AKTUELLE_VERSION);
  }
});

serwist.addEventListeners();
