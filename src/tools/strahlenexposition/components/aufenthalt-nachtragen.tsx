"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { zahlLesen } from "@/lib/zahl";
import { vonDatetimeLocal } from "@/lib/zeit";
import { aufenthaltNachtragen } from "../repository";
import type { OdlEinheit } from "../schema";
import { OdlEingabe } from "./odl-eingabe";

/** Abgeschlossenen Aufenthalt nachtragen, z. B. von der Whiteboard-Tabelle. */
export function AufenthaltNachtragen({ personId }: { personId: string }) {
  const [ort, setOrt] = useState("");
  const [beginn, setBeginn] = useState("");
  const [ende, setEnde] = useState("");
  const [odl, setOdl] = useState("");
  const [einheit, setEinheit] = useState<OdlEinheit>("µSv/h");
  const [dosimeter, setDosimeter] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const p = `nachtrag-${personId}`;

  async function absenden(event: FormEvent) {
    event.preventDefault();
    setFehler(null);
    const wert = zahlLesen(odl);
    const von = vonDatetimeLocal(beginn);
    const bis = vonDatetimeLocal(ende);
    if (wert === null || !von || !bis) {
      setFehler("Bitte Beginn, Ende und ODL vollständig angeben.");
      return;
    }
    try {
      await aufenthaltNachtragen(getDb(), personId, {
        ort,
        odl: wert,
        odlEinheit: einheit,
        beginn: von,
        ende: bis,
        dosimeterMsv: zahlLesen(dosimeter),
      });
      setOrt("");
      setBeginn("");
      setEnde("");
      setOdl("");
      setDosimeter("");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={absenden} className="grid gap-3 sm:grid-cols-2" aria-label="Aufenthalt nachtragen">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${p}-ort`}>Ort</Label>
        <Input id={`${p}-ort`} required autoComplete="off" value={ort} onChange={(e) => setOrt(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${p}-beginn`}>Beginn</Label>
        <Input id={`${p}-beginn`} type="datetime-local" required value={beginn} onChange={(e) => setBeginn(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${p}-ende`}>Ende</Label>
        <Input id={`${p}-ende`} type="datetime-local" required value={ende} onChange={(e) => setEnde(e.target.value)} />
      </div>
      <OdlEingabe id={`${p}-odl`} wert={odl} einheit={einheit} onWert={setOdl} onEinheit={setEinheit} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${p}-dosimeter`}>Dosimeter abgelesen (mSv, optional)</Label>
        <Input id={`${p}-dosimeter`} inputMode="decimal" autoComplete="off" value={dosimeter} onChange={(e) => setDosimeter(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary">
          <Plus /> Aufenthalt nachtragen
        </Button>
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {fehler}
        </p>
      )}
    </form>
  );
}
