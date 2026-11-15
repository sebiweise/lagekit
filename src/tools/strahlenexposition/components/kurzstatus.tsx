"use client";

import { useJetzt } from "@/lib/use-jetzt";
import { useAufenthalte, usePersonen, useRichtwerte } from "../hooks";
import { ampel, dosimeterSumme, gesamtdosis, type Ampel } from "../logic";
import { AmpelBadge } from "./ampel-badge";

const RANG: Record<Ampel, number> = { gruen: 0, gelb: 1, rot: 2 };

/** Kachel auf der Lage-Seite: wie viele Personen gerade im Bereich sind und die schlechteste Ampel. */
export function StrahlenKurzstatus({ einsatzId }: { einsatzId: string }) {
  const personen = usePersonen(einsatzId);
  const aufenthalte = useAufenthalte(einsatzId);
  const richtwerte = useRichtwerte();
  const jetzt = useJetzt();
  if (!personen || !aufenthalte || !richtwerte || !jetzt) return null;
  if (personen.length === 0) return <p className="text-muted-foreground">Noch keine Personen erfasst</p>;

  let schlechteste: Ampel = "gruen";
  let imBereich = 0;
  for (const p of personen) {
    const eigene = aufenthalte.filter((a) => a.personId === p.id);
    if (eigene.some((a) => a.ende === null)) imBereich++;
    const grenze = (richtwerte.find((r) => r.id === p.richtwertId) ?? richtwerte[0]).grenzeMsv;
    const zustand = ampel(gesamtdosis(eigene, jetzt), grenze, dosimeterSumme(eigene));
    if (RANG[zustand] > RANG[schlechteste]) schlechteste = zustand;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-medium">
        {personen.length} {personen.length === 1 ? "Person" : "Personen"}
        {imBereich > 0 && <span className="text-warn-foreground dark:text-warn"> · {imBereich} im Bereich</span>}
      </p>
      <AmpelBadge ampel={schlechteste} />
    </div>
  );
}
