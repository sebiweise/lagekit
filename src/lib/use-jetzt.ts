"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}

/** Aktuelle Zeit, sekündlich aktualisiert; `null` beim Vorrendern. */
export function useJetzt(): Date | null {
  const sekunde = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
  return sekunde === null ? null : new Date(sekunde * 1000);
}
