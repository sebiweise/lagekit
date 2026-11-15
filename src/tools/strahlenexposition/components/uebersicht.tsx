"use client";

import { ChevronRight } from "lucide-react";
import { formatDauer, formatZeit } from "@/lib/zeit";
import { cn } from "@/lib/utils";
import {
  ampel,
  aufenthaltDosis,
  dosimeterSumme,
  formatDosis,
  gesamtdosis,
  maxAufenthaltStunden,
  restdosis,
  type Ampel,
} from "../logic";
import type { Aufenthalt, Person, Richtwert } from "../schema";

const PUNKT: Record<Ampel, string> = { gruen: "bg-ok", gelb: "bg-warn", rot: "bg-destructive" };
const AMPEL_TEXT: Record<Ampel, string> = { gruen: "grün", gelb: "gelb", rot: "rot" };

/**
 * Die Tafel aus dem ELW auf einen Blick: je Person Status, Dosis und Ampel.
 * Wer gerade im Bereich ist, steht oben. Ein Tipp springt zur Karte der Person.
 */
export function Uebersicht({
  personen,
  jePerson,
  richtwerte,
  jetzt,
}: {
  personen: Person[];
  jePerson: Map<string, Aufenthalt[]>;
  richtwerte: Richtwert[];
  jetzt: Date;
}) {
  const zeilen = personen
    .map((person) => {
      const aufenthalte = jePerson.get(person.id) ?? [];
      const richtwert = richtwerte.find((r) => r.id === person.richtwertId) ?? richtwerte[0];
      const gesamt = gesamtdosis(aufenthalte, jetzt);
      const gemessen = dosimeterSumme(aufenthalte);
      const laufend = aufenthalte.find((a) => a.ende === null) ?? null;
      const rest = restdosis(Math.max(gesamt, gemessen ?? 0), richtwert.grenzeMsv);
      const restStunden = laufend ? maxAufenthaltStunden(rest, aufenthaltDosis(laufend, jetzt).odlMsvH) : null;
      return { person, gesamt, laufend, restStunden, zustand: ampel(gesamt, richtwert.grenzeMsv, gemessen) };
    })
    .sort((a, b) => Number(Boolean(b.laufend)) - Number(Boolean(a.laufend)));

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card" data-testid="dosis-uebersicht">
      {zeilen.map(({ person, gesamt, laufend, restStunden, zustand }) => (
        <li key={person.id}>
          <a
            href={`#person-${person.id}`}
            className={cn(
              "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-3 hover:bg-accent sm:px-4",
              laufend && "bg-warn/10",
            )}
          >
            <span className={cn("size-4 rounded-full", PUNKT[zustand])} title={`Ampel ${AMPEL_TEXT[zustand]}`}>
              <span className="sr-only">Ampel {AMPEL_TEXT[zustand]}</span>
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-lg font-semibold">
                {person.name}
                {person.trupp && <span className="font-normal text-muted-foreground"> · {person.trupp}</span>}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {laufend
                  ? `im Bereich seit ${formatZeit(laufend.beginn)} · ${laufend.ort}${
                      restStunden === 0
                        ? " · Richtwert erreicht"
                        : restStunden !== null && Number.isFinite(restStunden)
                          ? ` · noch ${formatDauer(restStunden * 60)}`
                          : ""
                    }`
                  : "außerhalb"}
              </span>
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatDosis(gesamt)}</span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
