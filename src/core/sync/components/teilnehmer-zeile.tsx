// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import type { Teilnehmer } from "../protokoll";

/** Name, Funktion, Fahrzeug und Gerät in einer Zeile. */
export function TeilnehmerAngaben({ teilnehmer }: { teilnehmer: Teilnehmer }) {
  return (
    <div>
      <p className="text-lg font-semibold">{teilnehmer.name}</p>
      <p className="text-sm text-muted-foreground">
        {[teilnehmer.funktion, teilnehmer.fahrzeug, teilnehmer.geraet].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
