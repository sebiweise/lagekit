"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { odlEinheitSchema, type OdlEinheit } from "../schema";

/**
 * ODL-Feld mit Einheitenwahl; die Einheit steht immer ausdrücklich dabei.
 * Liegt in einem Formular mit `FormProvider` und den Feldern `odl` und `odlEinheit`.
 */
export function OdlEingabe({ id }: { id: string }) {
  const { control } = useFormContext<{ odl: string; odlEinheit: OdlEinheit }>();
  return (
    <Controller
      name="odl"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>Ortsdosisleistung (ODL)</FieldLabel>
          <div className="flex gap-2">
            <Input
              {...field}
              id={id}
              inputMode="decimal"
              autoComplete="off"
              aria-required
              aria-invalid={fieldState.invalid}
              className="min-w-0 flex-1"
            />
            <Controller
              name="odlEinheit"
              control={control}
              render={({ field: einheit }) => (
                <Select {...einheit} aria-label="Einheit der ODL" className="w-28">
                  {odlEinheitSchema.options.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
