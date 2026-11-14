"use client";

import { useState, type FormEvent } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { zahlLesen } from "@/lib/zahl";
import { aufenthaltStarten, odlWechseln } from "../repository";
import type { OdlEinheit } from "../schema";
import { OdlEingabe } from "./odl-eingabe";

/**
 * Startet einen Aufenthalt für eine oder mehrere Personen (ein ganzer Trupp).
 * Mit `wechseln` werden laufende Aufenthalte beendet und mit neuem Ort und neuer ODL fortgesetzt.
 */
export function AufenthaltStart({
  idPrefix,
  personIds,
  beschriftung,
  wechseln = false,
  ortVorgabe = "",
}: {
  idPrefix: string;
  personIds: string[];
  beschriftung: string;
  wechseln?: boolean;
  ortVorgabe?: string;
}) {
  const [ort, setOrt] = useState(ortVorgabe);
  const [odl, setOdl] = useState("");
  const [einheit, setEinheit] = useState<OdlEinheit>("µSv/h");
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(event: FormEvent) {
    event.preventDefault();
    setFehler(null);
    const wert = zahlLesen(odl);
    if (wert === null) {
      setFehler("Bitte eine ODL als Zahl eingeben.");
      return;
    }
    try {
      const eingabe = { ort, odl: wert, odlEinheit: einheit };
      if (wechseln) {
        await odlWechseln(getDb(), personIds, eingabe);
        setOdl("");
      } else {
        await aufenthaltStarten(getDb(), personIds, eingabe);
      }
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={absenden} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" aria-label={beschriftung}>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-ort`}>Ort</Label>
        <Input id={`${idPrefix}-ort`} required autoComplete="off" value={ort} onChange={(e) => setOrt(e.target.value)} />
      </div>
      <OdlEingabe id={`${idPrefix}-odl`} wert={odl} einheit={einheit} onWert={setOdl} onEinheit={setEinheit} />
      <Button type="submit" variant={wechseln ? "secondary" : "default"}>
        {wechseln ? <RefreshCw /> : <Play />} {beschriftung}
      </Button>
      {fehler && (
        <p role="alert" className="text-sm text-destructive sm:col-span-3">
          {fehler}
        </p>
      )}
    </form>
  );
}
