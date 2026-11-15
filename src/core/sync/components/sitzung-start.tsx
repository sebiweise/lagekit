"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import Link from "next/link";
import { LogIn, Radio } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import type { Einsatz } from "@/core/einsatz/schema";
import { fehlerText } from "@/lib/formular";
import { cn } from "@/lib/utils";
import { ichLesen, ichSpeichern } from "../ich";
import type { Teilnehmer } from "../protokoll";
import { sitzungen } from "../sitzung";
import { useKurzcodeDienst, type KurzcodeDienst } from "../dienst-konfiguration";
import { ichFormularSchema, sitzungStartFormularSchema, type SitzungStartFormularWerte } from "../formular";
import { vermittlung } from "../vermittlung";
import { DienstHinweis } from "./dienst-hinweis";
import { IchFormular } from "./ich-formular";

/** Noch keine Sitzung: selbst leiten oder einer Sitzung beitreten. */
export function SitzungStart() {
  const einsatz = useAktiverEinsatz();
  const [ich, setIch] = useState<Teilnehmer | null>(null);
  const dienst = useKurzcodeDienst();

  useEffect(() => {
    void ichLesen(getDb()).then(setIch);
  }, []);

  if (!ich || einsatz === undefined || dienst === undefined) return null;
  return <SitzungStartFormular ich={ich} einsatz={einsatz} dienst={dienst} />;
}

function SitzungStartFormular({
  ich,
  einsatz,
  dienst,
}: {
  ich: Teilnehmer;
  einsatz: Einsatz | null;
  dienst: KurzcodeDienst | null;
}) {
  const form = useForm({
    resolver: zodResolver(sitzungStartFormularSchema),
    defaultValues: {
      name: ich.name,
      funktion: ich.funktion,
      fahrzeug: ich.fahrzeug,
      // Ist der Kurzcode in dieser Installation aus, bleibt nur der QR-Weg.
      weg: dienst === null ? "qr" : "kurzcode",
      kurzcode: "",
    } satisfies SitzungStartFormularWerte,
  });
  const weg = useWatch({ control: form.control, name: "weg" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const dienstFuerSitzung = dienst ? vermittlung : undefined;

  async function ausfuehren(werte: z.output<typeof ichFormularSchema>, aktion: (ich: Teilnehmer) => Promise<void>) {
    setFehler(null);
    setLaeuft(true);
    try {
      await aktion(await ichSpeichern(getDb(), { ...ich, ...werte }));
    } catch (e) {
      setFehler(fehlerText(e));
    } finally {
      setLaeuft(false);
    }
  }

  async function leiten() {
    // Zum Leiten zählen nur die eigenen Angaben, nicht der Kurzcode.
    if (!(await form.trigger(["name", "funktion", "fahrzeug"]))) return;
    const werte = ichFormularSchema.parse(form.getValues());
    await ausfuehren(werte, async (ich) => {
      if (!einsatz) return;
      await sitzungen.leiten(getDb(), einsatz, ich, dienstFuerSitzung);
    });
  }

  async function beitreten(werte: z.output<typeof sitzungStartFormularSchema>) {
    const { weg, kurzcode, ...angaben } = werte;
    await ausfuehren(angaben, async (ich) => {
      await sitzungen.beitreten(getDb(), ich, weg, kurzcode, dienstFuerSitzung);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ihre Angaben</CardTitle>
          <CardDescription>Diese Angaben sieht der Host, wenn Sie beitreten, und alle Geräte der Sitzung.</CardDescription>
        </CardHeader>
        <CardContent>
          <IchFormular control={form.control} geraet={ich.geraet} />
        </CardContent>
      </Card>

      {fehler && (
        <p role="alert" className="text-destructive">
          {fehler}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Sitzung leiten</CardTitle>
            <CardDescription>
              Dieses Gerät ist der Host. Andere Geräte treten bei und arbeiten am aktiven Einsatz mit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {einsatz ? (
              <>
                <p>
                  Einsatz: <strong>{einsatz.stichwort}</strong>
                </p>
                <Button onClick={() => void leiten()} disabled={laeuft} className="self-start">
                  <Radio /> Sitzung starten
                </Button>
              </>
            ) : (
              <Link href="/einsatz/" className={cn(buttonVariants(), "h-auto min-h-11 max-w-full self-start whitespace-normal py-2 text-left")}>
                Zuerst einen Einsatz anlegen oder auswählen
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Einer Sitzung beitreten</CardTitle>
            <CardDescription>Der Einsatz des Hosts wird auf dieses Gerät übernommen.</CardDescription>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={form.handleSubmit(beitreten)} className="flex flex-col gap-4" aria-label="Einer Sitzung beitreten">
              {dienst ? (
                <div role="radiogroup" aria-label="Weg" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  {(
                    [
                      ["kurzcode", "Mit Kurzcode"],
                      ["qr", "Offline mit QR-Code"],
                    ] as const
                  ).map(([wert, text]) => (
                    <button
                      key={wert}
                      type="button"
                      role="radio"
                      aria-checked={weg === wert}
                      onClick={() => form.setValue("weg", wert)}
                      className={cn(
                        "h-11 rounded-md px-2 text-sm font-medium",
                        weg === wert ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="kurzcode-aus">
                  Beitritt per Kurzcode ist in dieser Installation ausgeschaltet.
                </p>
              )}
              {weg === "kurzcode" && dienst ? (
                <Controller
                  name="kurzcode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="kurzcode">Kurzcode vom Host</FieldLabel>
                      <Input
                        {...field}
                        id="kurzcode"
                        aria-required
                        aria-invalid={fieldState.invalid}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="123 456"
                        className="font-mono text-2xl tracking-widest"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      <FieldDescription className="text-sm">
                        Braucht kurz Internet für den Verbindungsaufbau. Beide Geräte müssen im selben WLAN sein.
                      </FieldDescription>
                      <DienstHinweis dienst={dienst} />
                    </Field>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ganz ohne Internet: Sie zeigen dem Host einen QR-Code und scannen seine Antwort. Ohne Kamera lassen
                  sich die Codes auch kopieren oder als Datei übertragen. Beide Geräte müssen im selben WLAN sein.
                </p>
              )}
              <Button type="submit" disabled={laeuft} className="self-start">
                <LogIn /> Beitreten
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
