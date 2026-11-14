"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDatumZeit, formatZeit } from "@/lib/zeit";
import { cn } from "@/lib/utils";
import type { Eintrag } from "../schema";

/** Einträge, neueste zuerst. Korrigierte Einträge bleiben sichtbar und durchgestrichen. */
export function EintragListe({
  eintraege,
  alle,
  korrigiertDurch,
  onKorrigieren,
}: {
  eintraege: Eintrag[];
  alle: Map<string, Eintrag>;
  korrigiertDurch: Map<string, Eintrag>;
  onKorrigieren: (eintrag: Eintrag) => void;
}) {
  return (
    <ol className="flex flex-col divide-y rounded-xl border" reversed>
      {[...eintraege].reverse().map((e) => {
        const ersetzt = korrigiertDurch.get(e.id);
        const korrigiert = e.korrigiertEintragId ? alle.get(e.korrigiertEintragId) : undefined;
        const nachgetragen = Math.abs(new Date(e.erfasstAm).getTime() - new Date(e.zeitpunkt).getTime()) > 60_000;
        return (
          <li key={e.id} data-testid="tagebuch-eintrag" data-nr={e.nr} className="grid gap-x-4 gap-y-1 p-4 sm:grid-cols-[4rem_5rem_1fr_auto]">
            <span className="font-mono text-sm text-muted-foreground">Nr. {e.nr}</span>
            <time dateTime={e.zeitpunkt} className="font-mono font-semibold tabular-nums" title={formatDatumZeit(e.zeitpunkt)}>
              {formatZeit(e.zeitpunkt)}
            </time>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{e.art}</Badge>
                {(e.von || e.an) && (
                  <span className="text-muted-foreground">
                    {e.von || "?"} → {e.an || "?"}
                  </span>
                )}
                {korrigiert && <Badge variant="outline">korrigiert Nr. {korrigiert.nr}</Badge>}
                {ersetzt && (
                  <Badge variant="warn" data-testid="korrigiert-marker">
                    korrigiert durch Nr. {ersetzt.nr}
                  </Badge>
                )}
              </div>
              <p className={cn("whitespace-pre-wrap break-words text-lg", ersetzt && "text-muted-foreground line-through")}>
                {e.inhalt}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.verfasser && <>Verfasser: {e.verfasser} · </>}
                {nachgetragen ? `nachgetragen um ${formatZeit(e.erfasstAm)}` : `erfasst ${formatZeit(e.erfasstAm, true)}`}
              </p>
            </div>
            {!ersetzt && (
              <Button size="sm" variant="ghost" onClick={() => onKorrigieren(e)} aria-label={`Eintrag Nr. ${e.nr} korrigieren`}>
                <Pencil /> Korrigieren
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
