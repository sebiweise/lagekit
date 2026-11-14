"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useSyncExternalStore } from "react";
import { sitzungen } from "./sitzung";

/** Die laufende Sitzung dieses Geräts; rendert bei jedem Ereignis neu. */
export function useSitzung() {
  useSyncExternalStore(sitzungen.abonnieren, sitzungen.stand, () => 0);
  return sitzungen.aktuell();
}
