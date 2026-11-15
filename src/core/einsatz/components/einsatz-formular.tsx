"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { getDb } from "@/core/db/db";
import { t } from "@/i18n";
import { fehlerText } from "@/lib/formular";
import { vonDatetimeLocal, zuDatetimeLocal } from "@/lib/zeit";
import { StandortKnopf } from "@/core/standort/components/standort-knopf";
import { utmref } from "@/core/standort/utmref";
import { einsatzAnlegen, einsatzBearbeiten } from "../repository";
import {
  einsatzBearbeitenFormularSchema,
  einsatzFormularSchema,
  type Einsatz,
  type EinsatzFormularWerte,
} from "../schema";

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
  const [standortFehler, setStandortFehler] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(bearbeiten ? einsatzBearbeitenFormularSchema : einsatzFormularSchema),
    defaultValues: {
      stichwort: einsatz?.stichwort ?? "",
      ort: einsatz?.ort ?? "",
      einheit: einsatz?.einheit ?? "",
      koordinaten: einsatz?.koordinaten ?? null,
      // Beim Anlegen heißt leer: Beginn ist der Zeitpunkt des Anlegens.
      beginn: einsatz ? zuDatetimeLocal(new Date(einsatz.beginn)) : "",
    } satisfies EinsatzFormularWerte,
  });
  const koordinaten = useWatch({ control: form.control, name: "koordinaten" });

  async function absenden(werte: z.output<typeof einsatzFormularSchema>) {
    setFehler(null);
    try {
      if (bearbeiten) {
        // Unveränderter Beginn behält seine Sekunden; das Feld zeigt nur Minuten.
        const beginnUnveraendert = werte.beginn === vonDatetimeLocal(zuDatetimeLocal(new Date(einsatz.beginn)));
        await einsatzBearbeiten(getDb(), einsatz.id, {
          ...werte,
          beginn: beginnUnveraendert ? einsatz.beginn : werte.beginn,
        });
        onGespeichert?.();
        return;
      }
      await einsatzAnlegen(getDb(), werte);
      // Einheit bleibt für den nächsten Einsatz stehen.
      form.reset({ stichwort: "", ort: "", koordinaten: null, beginn: "", einheit: werte.einheit });
      onAngelegt?.();
    } catch (e) {
      setFehler(fehlerText(e));
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(absenden)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      aria-label={bearbeiten ? t.einsatz.bearbeitenTitel : t.einsatz.neu}
    >
      <Controller
        name="stichwort"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
            <FieldLabel htmlFor={`${praefix}-stichwort`}>{t.einsatz.stichwort} *</FieldLabel>
            <Input
              {...field}
              id={`${praefix}-stichwort`}
              aria-invalid={fieldState.invalid}
              aria-required
              autoComplete="off"
              placeholder={t.einsatz.stichwortBeispiel}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="ort"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
            <FieldLabel htmlFor={`${praefix}-ort`}>{t.einsatz.ort}</FieldLabel>
            <div className="flex gap-2">
              <Input
                {...field}
                id={`${praefix}-ort`}
                aria-invalid={fieldState.invalid}
                className="min-w-0 flex-1"
                autoComplete="off"
              />
              <StandortKnopf
                onErgebnis={(e) => {
                  form.setValue("ort", e.ort, { shouldDirty: true, shouldValidate: true });
                  form.setValue("koordinaten", e.koordinaten, { shouldDirty: true });
                }}
                onFehler={setStandortFehler}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            {standortFehler && <FieldError>{standortFehler}</FieldError>}
            {koordinaten && (
              <FieldDescription data-testid="einsatz-koordinaten">
                UTMREF {utmref(koordinaten.lat, koordinaten.lon)}
                {koordinaten.genauigkeit !== undefined && ` · ± ${koordinaten.genauigkeit} m`}{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm text-foreground underline"
                  onClick={() => form.setValue("koordinaten", null, { shouldDirty: true })}
                >
                  Punkt entfernen
                </Button>
              </FieldDescription>
            )}
          </Field>
        )}
      />
      <Controller
        name="einheit"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${praefix}-einheit`}>{t.einsatz.einheit}</FieldLabel>
            <Input {...field} id={`${praefix}-einheit`} aria-invalid={fieldState.invalid} autoComplete="off" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="beginn"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${praefix}-beginn`}>{t.einsatz.beginn}</FieldLabel>
            <Input
              {...field}
              id={`${praefix}-beginn`}
              type="datetime-local"
              aria-invalid={fieldState.invalid}
              aria-required={bearbeiten}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            {!bearbeiten && <FieldDescription>Leer lassen für „jetzt“.</FieldDescription>}
          </Field>
        )}
      />
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
