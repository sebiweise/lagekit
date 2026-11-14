/**
 * Registrierung des Service Workers und Update-Steuerung.
 * Nur im Produktions-Build aktiv; `next dev` läuft ohne Service Worker.
 */
export const SW_URL = "/sw.js";

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported() || process.env.NODE_ENV !== "production") return null;
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

/** Aktiviert eine wartende neue Version und lädt die Seite neu, sobald sie übernommen hat. */
export function activateWaitingWorker(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting;
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
}
