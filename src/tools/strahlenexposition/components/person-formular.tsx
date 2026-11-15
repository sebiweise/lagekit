"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { getDb } from "@/core/db/db";
import { fehlerText } from "@/lib/formular";
import { personAnlegen } from "../repository";
import { STANDARD_RICHTWERT_ID } from "../richtwerte";
import { personFormularSchema, type PersonFormularWerte, type Richtwert } from "../schema";

export function PersonFormular({
  einsatzId,
  richtwerte,
  trupps,
}: {
  einsatzId: string;
  richtwerte: Richtwert[];
  trupps: string[];
}) {
  const [fehler, setFehler] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(personFormularSchema),
    defaultValues: { name: "", trupp: "", richtwertId: STANDARD_RICHTWERT_ID } satisfies PersonFormularWerte,
  });

  async function absenden(werte: z.output<typeof personFormularSchema>) {
    setFehler(null);
    // Feld sofort leeren, damit schon die nächste Person getippt werden kann, während gespeichert wird.
    form.resetField("name");
    form.setFocus("name");
    try {
      await personAnlegen(getDb(), { einsatzId, ...werte });
    } catch (e) {
      if (!form.getValues("name")) form.setValue("name", werte.name);
      setFehler(fehlerText(e));
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(absenden)}
      className="grid grid-cols-1 gap-4 @xl:grid-cols-[2fr_1.5fr_2fr_auto] @xl:items-start"
      aria-label="Person anlegen"
    >
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="person-name">Name *</FieldLabel>
            <Input {...field} id="person-name" aria-required aria-invalid={fieldState.invalid} autoComplete="off" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="trupp"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="person-trupp">Trupp</FieldLabel>
            <Input
              {...field}
              id="person-trupp"
              aria-invalid={fieldState.invalid}
              autoComplete="off"
              list="trupp-vorschlaege"
              placeholder="z. B. AT 1"
            />
            <datalist id="trupp-vorschlaege">
              {trupps.map((t) => (
                <NativeSelectOption key={t} value={t} />
              ))}
            </datalist>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="richtwertId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="person-richtwert">Richtwert</FieldLabel>
            <NativeSelect {...field} id="person-richtwert" aria-invalid={fieldState.invalid}>
              {richtwerte.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {r.bezeichnung} ({r.grenzeMsv} mSv)
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {/* Abstand wie eine Feldbeschriftung, damit der Knopf auf Höhe der Felder steht. */}
      <Button type="submit" className="@xl:mt-[1.375rem]">
        <UserPlus /> Person anlegen
      </Button>
      {fehler && (
        <p role="alert" className="text-sm text-destructive @xl:col-span-4">
          {fehler}
        </p>
      )}
    </form>
  );
}
