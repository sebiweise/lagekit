"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { zahlLesen } from "@/lib/zahl";
import { vonDatetimeLocal } from "@/lib/zeit";
import { aufenthaltNachtragen, truppNachtragen } from "../repository";
import type { OdlEinheit } from "../schema";
import { OdlEingabe } from "./odl-eingabe";

/**
 * Abgeschlossenen Aufenthalt nachtragen, z. B. von der Whiteboard-Tabelle.
 * Bei mehreren Personen (Trupp) gilt der Aufenthalt für alle; Dosimeterwerte trägt
 * man danach je Person ein.
 */
export function AufenthaltNachtragen({ idPrefix, personIds }: { idPrefix: string; personIds: string[] }) {
  const einzeln = personIds.length === 1;
  const [ort, setOrt] = useState("");
  const [beginn, setBeginn] = useState("");
  const [ende, setEnde] = useState("");
  const [odl, setOdl] = useState("");
  const [einheit, setEinheit] = useState<OdlEinheit>("µSv/h");
  const [dosimeter, setDosimeter] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const p = idPrefix;

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
      const eingabe = { ort, odl: wert, odlEinheit: einheit, beginn: von, ende: bis };
      if (einzeln) {
        await aufenthaltNachtragen(getDb(), personIds[0], { ...eingabe, dosimeterMsv: zahlLesen(dosimeter) });
      } else {
        await truppNachtragen(getDb(), personIds, eingabe);
      }
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
    <form onSubmit={absenden} className="grid grid-cols-1 gap-3 @xl:grid-cols-2" aria-label="Aufenthalt nachtragen">
      <div className="flex flex-col gap-2 @xl:col-span-2">
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
      {einzeln && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${p}-dosimeter`}>Dosimeter abgelesen (mSv, optional)</Label>
          <Input id={`${p}-dosimeter`} inputMode="decimal" autoComplete="off" value={dosimeter} onChange={(e) => setDosimeter(e.target.value)} />
        </div>
      )}
      <div className="@xl:col-span-2">
        <Button type="submit" variant="secondary">
          <Plus /> {einzeln ? "Aufenthalt nachtragen" : "Für den Trupp nachtragen"}
        </Button>
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-destructive @xl:col-span-2">
          {fehler}
        </p>
      )}
    </form>
  );
}
