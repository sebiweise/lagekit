"use client";

import { useState, type FormEvent } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { t } from "@/i18n";
import { vonDatetimeLocal, zuDatetimeLocal } from "@/lib/zeit";
import { StandortKnopf } from "@/core/standort/components/standort-knopf";
import type { Koordinaten } from "@/core/standort/standort";
import { utmref } from "@/core/standort/utmref";
import { einsatzAnlegen, einsatzBearbeiten } from "../repository";
import type { Einsatz } from "../schema";

/**
 * Formular für die Stammdaten eines Einsatzes. Ohne `einsatz` legt es einen
 * neuen Einsatz an, mit `einsatz` ändert es dessen Angaben.
 */
export function EinsatzFormular({
  einsatz,
  onAngelegt,
  onGespeichert,
  onAbbrechen,
}: {
  einsatz?: Einsatz;
  onAngelegt?: () => void;
  onGespeichert?: () => void;
  onAbbrechen?: () => void;
}) {
  const bearbeiten = einsatz !== undefined;
  // Ids je Formular, damit Anlegen und Bearbeiten gleichzeitig auf einer Seite stehen können.
  const praefix = bearbeiten ? `einsatz-${einsatz.id}` : "einsatz";
  const [stichwort, setStichwort] = useState(einsatz?.stichwort ?? "");
  const [ort, setOrt] = useState(einsatz?.ort ?? "");
  const [koordinaten, setKoordinaten] = useState<Koordinaten | null>(einsatz?.koordinaten ?? null);
  const [standortFehler, setStandortFehler] = useState<string | null>(null);
  const [einheit, setEinheit] = useState(einsatz?.einheit ?? "");
  // Beim Anlegen heißt leer: Beginn ist der Zeitpunkt des Anlegens.
  const [beginn, setBeginn] = useState(einsatz ? zuDatetimeLocal(new Date(einsatz.beginn)) : "");
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFehler(null);
    try {
      if (bearbeiten) {
        // Unveränderter Beginn behält seine Sekunden; das Feld zeigt nur Minuten.
        const beginnUnveraendert = beginn === zuDatetimeLocal(new Date(einsatz.beginn));
        const beginnNeu = beginnUnveraendert ? einsatz.beginn : vonDatetimeLocal(beginn);
        if (!beginnNeu) throw new Error("Beginn fehlt");
        await einsatzBearbeiten(getDb(), einsatz.id, { stichwort, ort, koordinaten, einheit, beginn: beginnNeu });
        onGespeichert?.();
        return;
      }
      await einsatzAnlegen(getDb(), {
        stichwort,
        ort,
        koordinaten,
        einheit,
        beginn: vonDatetimeLocal(beginn) ?? undefined,
      });
      setStichwort("");
      setOrt("");
      setKoordinaten(null);
      setBeginn("");
      onAngelegt?.();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form
      onSubmit={absenden}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      aria-label={bearbeiten ? t.einsatz.bearbeitenTitel : t.einsatz.neu}
    >
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${praefix}-stichwort`}>{t.einsatz.stichwort} *</Label>
        <Input
          id={`${praefix}-stichwort`}
          required
          autoComplete="off"
          placeholder={t.einsatz.stichwortBeispiel}
          value={stichwort}
          onChange={(e) => setStichwort(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${praefix}-ort`}>{t.einsatz.ort}</Label>
        <div className="flex gap-2">
          <Input
            id={`${praefix}-ort`}
            className="min-w-0 flex-1"
            autoComplete="off"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
          />
          <StandortKnopf
            onErgebnis={(e) => {
              setOrt(e.ort);
              setKoordinaten(e.koordinaten);
            }}
            onFehler={setStandortFehler}
          />
        </div>
        {standortFehler && (
          <p role="alert" className="text-sm text-destructive">
            {standortFehler}
          </p>
        )}
        {koordinaten && (
          <p className="text-xs text-muted-foreground" data-testid="einsatz-koordinaten">
            UTMREF {utmref(koordinaten.lat, koordinaten.lon)}
            {koordinaten.genauigkeit !== undefined && ` · ± ${koordinaten.genauigkeit} m`}{" "}
            <button type="button" className="underline" onClick={() => setKoordinaten(null)}>
              Punkt entfernen
            </button>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${praefix}-einheit`}>{t.einsatz.einheit}</Label>
        <Input
          id={`${praefix}-einheit`}
          autoComplete="off"
          value={einheit}
          onChange={(e) => setEinheit(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${praefix}-beginn`}>{t.einsatz.beginn}</Label>
        <Input
          id={`${praefix}-beginn`}
          type="datetime-local"
          required={bearbeiten}
          value={beginn}
          onChange={(e) => setBeginn(e.target.value)}
        />
        {!bearbeiten && <p className="text-xs text-muted-foreground">Leer lassen für „jetzt“.</p>}
      </div>
      {bearbeiten && (
        <p className="text-sm text-muted-foreground sm:col-span-2">{t.einsatz.bearbeitenHinweis}</p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        {onAbbrechen && (
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onAbbrechen}>
            {t.einsatz.abbrechen}
          </Button>
        )}
        <Button type="submit" className="w-full sm:w-auto">
          {bearbeiten ? (
            <>
              <Save /> {t.einsatz.speichern}
            </>
          ) : (
            <>
              <Plus /> {t.einsatz.anlegen}
            </>
          )}
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
