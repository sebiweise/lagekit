"use client";

import { FileText, Film, File, Image as BildIcon } from "lucide-react";
import { dateiArt } from "@/core/dateien/components/datei-vorschau";
import { groesseText } from "@/core/dateien/ordner";
import type { DateiTreffer } from "@/core/dateien/verweis";
import { formatZeit } from "@/lib/zeit";
import { cn } from "@/lib/utils";

/** Wo im Text ein „/“-Befehl läuft: Position des Schrägstrichs und Suchtext bis zur Schreibmarke. */
export interface Ausloeser {
  start: number;
  ende: number;
  suche: string;
}

/**
 * Erkennt einen „/“-Befehl: Schrägstrich am Anfang oder nach einem Leerzeichen,
 * danach bis zur Schreibmarke höchstens 40 Zeichen. „1/2“ oder „A/B“ lösen nichts aus.
 */
export function ausloeserFinden(text: string, marke: number): Ausloeser | null {
  const davor = text.slice(0, marke);
  const start = davor.lastIndexOf("/");
  if (start < 0 || marke - start > 41) return null;
  if (start > 0 && !/\s/.test(davor[start - 1])) return null;
  const suche = davor.slice(start + 1);
  if (/[\n[\]]/.test(suche) || /\s\s/.test(suche)) return null;
  return { start, ende: marke, suche };
}

export function DateiAuswahl({
  treffer,
  aktiv,
  onWaehlen,
}: {
  treffer: DateiTreffer[];
  aktiv: number;
  onWaehlen: (t: DateiTreffer) => void;
}) {
  return (
    <ul
      id="tb-dateien"
      role="listbox"
      aria-label="Datei verknüpfen"
      className="absolute top-full right-0 left-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
    >
      {treffer.map((t, i) => {
        const art = dateiArt(t.pfad);
        const Icon = art === "bild" ? BildIcon : art === "video" ? Film : art === "text" || art === "pdf" ? FileText : File;
        return (
          <li
            key={`${t.ordner}/${t.pfad}`}
            id={`tb-datei-${i}`}
            role="option"
            aria-selected={i === aktiv}
            className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", i === aktiv && "bg-accent text-accent-foreground")}
            // mousedown statt click: sonst verliert das Textfeld vorher den Fokus.
            onMouseDown={(e) => {
              e.preventDefault();
              onWaehlen(t);
            }}
          >
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t.pfad.split("/").pop()}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {t.ordner}/{t.pfad} · {groesseText(t.groesse)} · {formatZeit(new Date(t.geaendert))}
              </span>
            </span>
          </li>
        );
      })}
      <li className="border-t px-3 py-1.5 text-xs text-muted-foreground" aria-hidden>
        ↑↓ wählen · Enter übernimmt · Esc schließt
      </li>
    </ul>
  );
}
