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

/**
 * Aktiviert eine wartende neue Version. Das Neuladen übernimmt der
 * `controllerchange`-Hörer aus `pwaStarten()` (update.ts) in allen Tabs.
 */
export function activateWaitingWorker(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}
