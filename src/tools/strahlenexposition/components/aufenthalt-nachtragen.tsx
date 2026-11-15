"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getDb } from "@/core/db/db";
import { fehlerText } from "@/lib/formular";
import { aufenthaltNachtragen, truppNachtragen } from "../repository";
import { aufenthaltNachtragenFormularSchema, type AufenthaltNachtragenFormularWerte } from "../schema";
import { OdlEingabe } from "./odl-eingabe";

const LEER: AufenthaltNachtragenFormularWerte = {
  ort: "",
  beginn: "",
  ende: "",
  odl: "",
  odlEinheit: "µSv/h",
  dosimeterMsv: "",
};

/**
 * Abgeschlossenen Aufenthalt nachtragen, z. B. von der Whiteboard-Tabelle.
 * Bei mehreren Personen (Trupp) gilt der Aufenthalt für alle; Dosimeterwerte trägt
 * man danach je Person ein.
 */
export function AufenthaltNachtragen({ idPrefix, personIds }: { idPrefix: string; personIds: string[] }) {
  const einzeln = personIds.length === 1;
  const [fehler, setFehler] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(aufenthaltNachtragenFormularSchema), defaultValues: LEER });
  const p = idPrefix;

  async function absenden(werte: z.output<typeof aufenthaltNachtragenFormularSchema>) {
    setFehler(null);
    try {
      const { dosimeterMsv, ...eingabe } = werte;
      if (einzeln) {
        await aufenthaltNachtragen(getDb(), personIds[0], { ...eingabe, dosimeterMsv });
      } else {
        await truppNachtragen(getDb(), personIds, eingabe);
      }
      // Einheit bleibt für den nächsten Aufenthalt stehen.
      form.reset({ ...LEER, odlEinheit: werte.odlEinheit });
    } catch (e) {
      setFehler(fehlerText(e));
    }
  }

  const textFeld = (
    name: "ort" | "beginn" | "ende" | "dosimeterMsv",
    titel: string,
    props: React.ComponentProps<typeof Input>,
    className?: string,
  ) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={`${p}-${name === "dosimeterMsv" ? "dosimeter" : name}`}>{titel}</FieldLabel>
          <Input
            {...props}
            {...field}
            id={`${p}-${name === "dosimeterMsv" ? "dosimeter" : name}`}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(absenden)}
        className="grid grid-cols-1 gap-3 @xl:grid-cols-2"
        aria-label="Aufenthalt nachtragen"
      >
        {textFeld("ort", "Ort", { autoComplete: "off", "aria-required": true }, "@xl:col-span-2")}
        {textFeld("beginn", "Beginn", { type: "datetime-local", "aria-required": true })}
        {textFeld("ende", "Ende", { type: "datetime-local", "aria-required": true })}
        <OdlEingabe id={`${p}-odl`} />
        {einzeln &&
          textFeld("dosimeterMsv", "Dosimeter abgelesen (mSv, optional)", { inputMode: "decimal", autoComplete: "off" })}
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
    </FormProvider>
  );
}
