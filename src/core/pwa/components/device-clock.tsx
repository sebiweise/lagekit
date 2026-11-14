"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/i18n";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}

const format = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const formatDatum = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Große Anzeige der Gerätezeit, damit eine falsch gehende Uhr sofort auffällt
 * (alle Zeitstempel kommen von dieser Uhr).
 */
export function DeviceClock() {
  // Auf volle Sekunden gerundet, damit sich der Snapshot nur einmal pro Sekunde ändert.
  const sekunde = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
  const jetzt = sekunde === null ? null : new Date(sekunde * 1000);

  return (
    <div className="sm:text-right" aria-live="off">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {t.status.geraetezeit}
      </div>
      <time
        className="block font-mono text-3xl font-semibold tabular-nums sm:text-4xl"
        dateTime={jetzt?.toISOString()}
      >
        {jetzt ? format.format(jetzt) : "--:--:--"}
      </time>
      <div className="text-sm text-muted-foreground">
        {jetzt ? formatDatum.format(jetzt) : " "}
      </div>
    </div>
  );
}
