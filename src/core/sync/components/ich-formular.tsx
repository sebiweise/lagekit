"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { Controller, type Control } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SitzungStartFormularWerte } from "../formular";

/** Eigene Angaben, die der Host beim Beitritt sieht; Teil des Formulars „Gemeinsam arbeiten“. */
export function IchFormular({ control, geraet }: { control: Control<SitzungStartFormularWerte>; geraet: string }) {
  const feld = (schluessel: "name" | "funktion" | "fahrzeug", titel: string, pflicht = false) => (
    <Controller
      name={schluessel}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`ich-${schluessel}`}>
            {titel}
            {pflicht && " *"}
          </FieldLabel>
          <Input
            {...field}
            value={field.value ?? ""}
            id={`ich-${schluessel}`}
            aria-required={pflicht}
            aria-invalid={fieldState.invalid}
            autoComplete="off"
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
      {feld("name", "Name", true)}
      {feld("funktion", "Funktion")}
      {feld("fahrzeug", "Fahrzeug")}
      <p className="text-sm text-muted-foreground sm:col-span-3">Dieses Gerät: {geraet}</p>
    </div>
  );
}
