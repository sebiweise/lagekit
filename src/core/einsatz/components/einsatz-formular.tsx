"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { t } from "@/i18n";
import { vonDatetimeLocal } from "@/lib/zeit";
import { einsatzAnlegen } from "../repository";

export function EinsatzFormular({ onAngelegt }: { onAngelegt?: () => void }) {
  const [stichwort, setStichwort] = useState("");
  const [ort, setOrt] = useState("");
  const [einheit, setEinheit] = useState("");
  // Leer heißt: Beginn ist der Zeitpunkt des Anlegens.
  const [beginn, setBeginn] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFehler(null);
    try {
      await einsatzAnlegen(getDb(), {
        stichwort,
        ort,
        einheit,
        beginn: vonDatetimeLocal(beginn) ?? undefined,
      });
      setStichwort("");
      setOrt("");
      setBeginn("");
      onAngelegt?.();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={absenden} className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={t.einsatz.neu}>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="einsatz-stichwort">{t.einsatz.stichwort} *</Label>
        <Input
          id="einsatz-stichwort"
          required
          autoComplete="off"
          placeholder={t.einsatz.stichwortBeispiel}
          value={stichwort}
          onChange={(e) => setStichwort(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="einsatz-ort">{t.einsatz.ort}</Label>
        <Input id="einsatz-ort" autoComplete="off" value={ort} onChange={(e) => setOrt(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="einsatz-einheit">{t.einsatz.einheit}</Label>
        <Input
          id="einsatz-einheit"
          autoComplete="off"
          value={einheit}
          onChange={(e) => setEinheit(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="einsatz-beginn">{t.einsatz.beginn}</Label>
        <Input
          id="einsatz-beginn"
          type="datetime-local"
          value={beginn}
          onChange={(e) => setBeginn(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Leer lassen für „jetzt“.</p>
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full sm:w-auto">
          <Plus /> {t.einsatz.anlegen}
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
