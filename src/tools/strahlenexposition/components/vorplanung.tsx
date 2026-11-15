"use client";

import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { zahlLesen } from "@/lib/zahl";
import { formatDauer } from "@/lib/zeit";
import { maxAufenthaltStunden, odlInMsvProStunde, rechenwegVorplanung, restdosis } from "../logic";
import { STANDARD_RICHTWERT_ID } from "../richtwerte";
import { vorplanungFormularSchema, type Richtwert, type VorplanungFormularWerte } from "../schema";
import { OdlEingabe } from "./odl-eingabe";

/** Wie lange darf ein Trupp bei gegebener ODL bleiben? */
export function Vorplanung({
  richtwerte,
  personen,
}: {
  richtwerte: Richtwert[];
  /** Personen mit bisheriger Dosis, um deren Restdosis zu nutzen. */
  personen: { id: string; name: string; dosisMsv: number; richtwertId: string }[];
}) {
  const form = useForm({
    resolver: zodResolver(vorplanungFormularSchema),
    // Fehler gleich beim Tippen zeigen: die Vorplanung hat keinen Absende-Knopf.
    mode: "onChange",
    defaultValues: {
      odl: "",
      odlEinheit: "µSv/h",
      personId: "",
      bisher: "0",
      richtwertId: richtwerte.find((r) => r.id === STANDARD_RICHTWERT_ID)?.id ?? richtwerte[0].id,
    } satisfies VorplanungFormularWerte,
  });
  const eingabe = useWatch({ control: form.control });
  const geprueft = vorplanungFormularSchema.safeParse(eingabe);
  const personId = eingabe.personId ?? "";

  const person = personen.find((p) => p.id === personId);
  const richtwert =
    richtwerte.find((r) => r.id === (person?.richtwertId ?? eingabe.richtwertId)) ?? richtwerte[0];
  const bisherMsv = person ? person.dosisMsv : (zahlLesen(eingabe.bisher ?? "") ?? 0);
  // Ein Fehler in einem Feld, das gerade nicht zählt (bisherige Dosis bei gewählter Person), stört nicht.
  const odlGueltig = geprueft.success || !geprueft.error.issues.some((i) => i.path[0] === "odl");
  const odlWert = odlGueltig ? zahlLesen(eingabe.odl ?? "") : null;
  const bisherGueltig = person || geprueft.success || !geprueft.error.issues.some((i) => i.path[0] === "bisher");
  const odlMsvH = odlWert === null || !bisherGueltig ? null : odlInMsvProStunde(odlWert, eingabe.odlEinheit ?? "µSv/h");
  const stunden = odlMsvH === null ? null : maxAufenthaltStunden(restdosis(bisherMsv, richtwert.grenzeMsv), odlMsvH);

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 gap-4 @xl:grid-cols-2"
        aria-label="Vorplanung"
      >
        <OdlEingabe id="vorplanung-odl" />
        <Controller
          name="personId"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="vorplanung-person">Bisherige Dosis</FieldLabel>
              <NativeSelect {...field} id="vorplanung-person">
                <NativeSelectOption value="">Von Hand eingeben</NativeSelectOption>
                {personen.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        {!person && (
          <>
            <Controller
              name="bisher"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="vorplanung-bisher">Bisherige Dosis (mSv)</FieldLabel>
                  <Input {...field} id="vorplanung-bisher" inputMode="decimal" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="richtwertId"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="vorplanung-richtwert">Richtwert</FieldLabel>
                  <NativeSelect {...field} id="vorplanung-richtwert">
                    {richtwerte.map((r) => (
                      <NativeSelectOption key={r.id} value={r.id}>
                        {r.bezeichnung} ({r.grenzeMsv} mSv)
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            />
          </>
        )}
        <div className="rounded-md bg-muted p-4 @xl:col-span-2" data-testid="vorplanung-ergebnis" aria-live="polite">
          {stunden === null || odlMsvH === null ? (
            <p className="text-muted-foreground">ODL eingeben, um die zulässige Aufenthaltsdauer zu berechnen.</p>
          ) : (
            <>
              <p className="text-2xl font-semibold">
                {stunden === 0
                  ? "Kein Aufenthalt mehr zulässig"
                  : Number.isFinite(stunden)
                    ? `Höchstens ${formatDauer(stunden * 60)}`
                    : "Keine Zeitbegrenzung"}
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {rechenwegVorplanung(richtwert.grenzeMsv, bisherMsv, odlMsvH)}
              </p>
              <p className="text-sm text-muted-foreground">
                Richtwert: {richtwert.bezeichnung} ({richtwert.grenzeMsv} mSv). Rechnung bei gleichbleibender ODL, ohne Sicherheitszuschlag.
              </p>
            </>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
