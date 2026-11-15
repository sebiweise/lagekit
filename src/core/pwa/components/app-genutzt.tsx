"use client";

import { useEffect } from "react";
import { APP_GENUTZT_SCHLUESSEL } from "@/core/pwa/adressen";

/** Merkt sich, dass die App auf diesem Gerät genutzt wird: `/` führt dann direkt in die App. */
export function AppGenutzt() {
  useEffect(() => {
    try {
      localStorage.setItem(APP_GENUTZT_SCHLUESSEL, "1");
    } catch {
      // Ohne localStorage (privater Modus) bleibt die Startseite sichtbar.
    }
  }, []);
  return null;
}
