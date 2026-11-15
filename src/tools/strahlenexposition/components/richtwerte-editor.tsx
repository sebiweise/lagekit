"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/core/db/db";
import { richtwerteSpeichern } from "../repository";
import { richtwerteFormularSchema, type Richtwert, type RichtwerteFormularWerte } from "../schema";

function alsText(richtwerte: Richtwert[]): RichtwerteFormularWerte {
  return { werte: richtwerte.map((r) => ({ grenzeMsv: String(r.grenzeMsv).replace(".", ",") })) };
}

/** Richtwerte anpassen; gilt für alle Einsätze auf diesem Gerät. */
export function RichtwerteEditor({ richtwerte }: { richtwerte: Richtwert[] }) {
  const [meldung, setMeldung] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(richtwerteFormularSchema), defaultValues: alsText(richtwerte) });

  async function speichern({ werte }: z.output<typeof richtwerteFormularSchema>) {
    await richtwerteSpeichern(
      getDb(),
      richtwerte.map((r, i) => ({ ...r, grenzeMsv: werte[i].grenzeMsv })),
    );
    setMeldung("Gespeichert.");
  }

  async function zuruecksetzen() {
    await richtwerteSpeichern(getDb(), null);
    // Die Standardwerte kommen über `richtwerte` zurück; der Aufrufer baut das Formular dann neu auf.
    form.clearErrors();
    setMeldung("Standardwerte wiederhergestellt.");
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(speichern, () => setMeldung(null))}
      className="flex flex-col gap-3"
      aria-label="Richtwerte"
    >
      <Table>
        <TableHeader className="text-muted-foreground">
          <TableRow className="border-b">
            <TableHead className="py-2 pr-3 font-medium">Einsatzanlass</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Richtwert (mSv)</TableHead>
            <TableHead className="py-2 font-medium">Hinweis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {richtwerte.map((r, i) => (
            <TableRow key={r.id} className="border-b align-top">
              <TableCell className="py-2 pr-3">{r.bezeichnung}</TableCell>
              <TableCell className="py-2 pr-3">
                <Controller
                  name={`werte.${i}.grenzeMsv`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <Input
                        {...field}
                        aria-label={`Richtwert ${r.bezeichnung}`}
                        aria-invalid={fieldState.invalid}
                        inputMode="decimal"
                        className="h-10 w-24"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                  )}
                />
              </TableCell>
              <TableCell className="py-2 text-muted-foreground">{r.hinweis}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary">
          Richtwerte speichern
        </Button>
        <Button type="button" variant="ghost" onClick={() => void zuruecksetzen()}>
          Standardwerte
        </Button>
      </div>
      {meldung && <p role="status">{meldung}</p>}
    </form>
  );
}
