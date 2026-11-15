"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Teilnehmer } from "../protokoll";

/** Eigene Angaben, die der Host beim Beitritt sieht. */
export function IchFormular({ ich, onAendern }: { ich: Teilnehmer; onAendern: (ich: Teilnehmer) => void }) {
  const feld = (schluessel: "name" | "funktion" | "fahrzeug", titel: string, pflicht = false) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`ich-${schluessel}`}>
        {titel}
        {pflicht && " *"}
      </Label>
      <Input
        id={`ich-${schluessel}`}
        required={pflicht}
        autoComplete="off"
        value={ich[schluessel]}
        onChange={(e) => onAendern({ ...ich, [schluessel]: e.target.value })}
      />
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {feld("name", "Name", true)}
      {feld("funktion", "Funktion")}
      {feld("fahrzeug", "Fahrzeug")}
      <p className="text-sm text-muted-foreground sm:col-span-3">Dieses Gerät: {ich.geraet}</p>
    </div>
  );
}
