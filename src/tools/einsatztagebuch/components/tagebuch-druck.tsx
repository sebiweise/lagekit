"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DruckenKnopf } from "@/core/export/components/drucken-knopf";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { APP_VERSION } from "@/core/version";
import { cn } from "@/lib/utils";
import { formatDatumZeit, formatZeit } from "@/lib/zeit";
import { useEintraege } from "../hooks";
import { chronologisch, korrekturen } from "../logic";

/**
 * Druckfassung: fortlaufendes Tagebuch mit Kopf (Einsatz, Einheit, Zeitraum),
 * der sich auf jeder Seite wiederholt, und Seitenzahlen im Seitenrand.
 */
export function TagebuchDruck() {
  const einsatz = useAktiverEinsatz();
  const eintraege = useEintraege(einsatz?.id);

  if (einsatz === undefined) return null;
  if (einsatz === null) {
    return (
      <p>
        Kein Einsatz aktiv. <Link href="/einsatz/">Einsatz auswählen</Link>
      </p>
    );
  }
  if (!eintraege) return null;

  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  const korrigiertDurch = korrekturen(eintraege);
  const erstellt = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <DruckenKnopf />
        <Link href="/tools/einsatztagebuch/" className={buttonVariants({ variant: "outline" })}>
          Zurück zum Tagebuch
        </Link>
      </div>

      <table className="tagebuch-druck w-full text-left text-sm" data-testid="tagebuch-druck">
        <thead>
          <tr>
            <th colSpan={6} className="pb-3 font-normal">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-foreground pb-2">
                <div>
                  <p className="text-xl font-bold">Einsatztagebuch: {einsatz.stichwort}</p>
                  <p>
                    {[einsatz.ort, einsatz.einheit].filter(Boolean).join(" · ")}
                    {(einsatz.ort || einsatz.einheit) && " · "}
                    {formatDatumZeit(einsatz.beginn)} bis {einsatz.ende ? formatDatumZeit(einsatz.ende) : "laufend"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lagekit {APP_VERSION} · Stand {formatDatumZeit(erstellt)}
                </p>
              </div>
            </th>
          </tr>
          <tr className="border-b">
            <th className="py-1 pr-2 font-semibold">Nr.</th>
            <th className="py-1 pr-2 font-semibold">Zeit</th>
            <th className="py-1 pr-2 font-semibold">Art</th>
            <th className="py-1 pr-2 font-semibold">Von → An</th>
            <th className="py-1 pr-2 font-semibold">Inhalt</th>
            <th className="py-1 font-semibold">Verfasser</th>
          </tr>
        </thead>
        <tbody>
          {chronologisch(eintraege).map((e) => {
            const ersetzt = korrigiertDurch.get(e.id);
            const korrigiert = e.korrigiertEintragId ? nachId.get(e.korrigiertEintragId) : undefined;
            return (
              <tr key={e.id} className="break-inside-avoid border-b align-top">
                <td className="py-1 pr-2 font-mono">{e.nr}</td>
                <td className="py-1 pr-2 font-mono tabular-nums">{formatZeit(e.zeitpunkt)}</td>
                <td className="py-1 pr-2">{e.art}</td>
                <td className="py-1 pr-2">{e.von || e.an ? `${e.von || "?"} → ${e.an || "?"}` : ""}</td>
                <td className="py-1 pr-2">
                  <span className={cn("whitespace-pre-wrap", ersetzt && "line-through")}>{e.inhalt}</span>
                  {korrigiert && <span className="block text-xs">(korrigiert Nr. {korrigiert.nr})</span>}
                  {ersetzt && <span className="block text-xs">(korrigiert durch Nr. {ersetzt.nr})</span>}
                </td>
                <td className="py-1">{e.verfasser}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {eintraege.length === 0 && <p>Keine Einträge.</p>}
    </div>
  );
}
