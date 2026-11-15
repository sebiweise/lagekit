"use client";

import { formatZeit } from "@/lib/zeit";
import { useEintraege } from "../hooks";

/** Kachel auf der Lage-Seite: Anzahl und letzter Eintrag. */
export function TagebuchKurzstatus({ einsatzId }: { einsatzId: string }) {
  const eintraege = useEintraege(einsatzId);
  if (!eintraege) return null;
  if (eintraege.length === 0) return <p className="text-muted-foreground">Noch keine Einträge</p>;
  const letzter = eintraege.reduce((a, b) => (b.erfasstAm > a.erfasstAm ? b : a));
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="font-medium">{eintraege.length === 1 ? "1 Eintrag" : `${eintraege.length} Einträge`}</p>
      <p className="truncate text-sm text-muted-foreground">
        <span className="font-mono tabular-nums">{formatZeit(letzter.zeitpunkt)}</span> {letzter.inhalt}
      </p>
    </div>
  );
}
