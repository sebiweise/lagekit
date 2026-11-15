"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getDb } from "@/core/db/db";
import { cn } from "@/lib/utils";
import { dosimeterSetzen } from "../repository";
import { dosimeterText, type Aufenthalt } from "../schema";

const dosimeterFormularSchema = z.object({ dosimeterMsv: dosimeterText });

/** Abgelesener Dosimeterwert eines Aufenthalts; speichert beim Verlassen des Felds. */
export function DosimeterFeld({
  aufenthalt,
  className,
  ...props
}: { aufenthalt: Aufenthalt } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur">) {
  const form = useForm({
    resolver: zodResolver(dosimeterFormularSchema),
    mode: "onBlur",
    defaultValues: {
      dosimeterMsv: aufenthalt.dosimeterMsv === null ? "" : String(aufenthalt.dosimeterMsv).replace(".", ","),
    },
  });

  const speichern = form.handleSubmit(async ({ dosimeterMsv }) => {
    if (dosimeterMsv !== aufenthalt.dosimeterMsv) await dosimeterSetzen(getDb(), aufenthalt.id, dosimeterMsv);
  });

  return (
    <Controller
      name="dosimeterMsv"
      control={form.control}
      render={({ field, fieldState }) => (
        <span className="flex flex-col gap-1">
          <Input
            {...props}
            {...field}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={fieldState.invalid}
            className={cn(className)}
            onBlur={() => {
              field.onBlur();
              void speichern();
            }}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </span>
      )}
    />
  );
}
