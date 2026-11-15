"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getDb } from "@/core/db/db";
import { fehlerText } from "@/lib/formular";
import { aufenthaltStarten, odlWechseln } from "../repository";
import { aufenthaltStartFormularSchema, type AufenthaltStartFormularWerte } from "../schema";
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
  const [fehler, setFehler] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(aufenthaltStartFormularSchema),
    defaultValues: { ort: ortVorgabe, odl: "", odlEinheit: "µSv/h" } satisfies AufenthaltStartFormularWerte,
  });

  async function absenden(werte: z.output<typeof aufenthaltStartFormularSchema>) {
    setFehler(null);
    try {
      if (wechseln) {
        await odlWechseln(getDb(), personIds, werte);
        form.resetField("odl");
      } else {
        await aufenthaltStarten(getDb(), personIds, werte);
      }
    } catch (e) {
      setFehler(fehlerText(e));
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(absenden)}
        className="grid grid-cols-1 gap-3 @xl:grid-cols-[1fr_1fr_auto] @xl:items-start"
        aria-label={beschriftung}
      >
        <Controller
          name="ort"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-ort`}>Ort</FieldLabel>
              <Input {...field} id={`${idPrefix}-ort`} aria-required aria-invalid={fieldState.invalid} autoComplete="off" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <OdlEingabe id={`${idPrefix}-odl`} />
        <Button type="submit" variant={wechseln ? "secondary" : "default"} className="@xl:mt-[1.375rem]">
          {wechseln ? <RefreshCw /> : <Play />} {beschriftung}
        </Button>
        {fehler && (
          <p role="alert" className="text-sm text-destructive @xl:col-span-3">
            {fehler}
          </p>
        )}
      </form>
    </FormProvider>
  );
}
