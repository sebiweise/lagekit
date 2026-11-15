"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, FileUp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { pflichtText } from "@/lib/formular";
import { QrScanner } from "./qr-scanner";

const codeFormularSchema = z.object({ code: pflichtText("Bitte zuerst einen Code einfügen, scannen oder als Datei öffnen.") });

/** Nimmt einen Code entgegen: per Kamera, als eingefügter Text oder aus einer Datei. */
export function CodeEingabe({
  id,
  beschriftung,
  knopf,
  onCode,
}: {
  id: string;
  beschriftung: string;
  knopf: string;
  onCode: (code: string) => Promise<void>;
}) {
  const form = useForm({ resolver: zodResolver(codeFormularSchema), defaultValues: { code: "" } });
  const [scannen, setScannen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const uebernehmen = useCallback(
    async (code: string) => {
      setFehler(null);
      setLaeuft(true);
      try {
        await onCode(code.trim());
        form.reset();
        setScannen(false);
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
      } finally {
        setLaeuft(false);
      }
    },
    [onCode, form],
  );
  const gescannt = useCallback((code: string) => void uebernehmen(code), [uebernehmen]);


  return (
    <form noValidate onSubmit={form.handleSubmit(({ code }) => uebernehmen(code))} className="flex flex-col gap-3" aria-label={beschriftung}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={scannen ? "secondary" : "outline"} onClick={() => setScannen((s) => !s)}>
          <Camera /> {scannen ? "Kamera schließen" : "QR-Code scannen"}
        </Button>
        <label className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
            <FileUp /> Datei öffnen
            <input
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={(e) => {
                const datei = e.target.files?.[0];
                e.target.value = "";
                if (datei) void datei.text().then(uebernehmen);
              }}
            />
        </label>
      </div>
      {scannen && <QrScanner onCode={gescannt} />}
      <Controller
        name="code"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{beschriftung}</FieldLabel>
            <Textarea
              {...field}
              id={id}
              aria-invalid={fieldState.invalid}
              placeholder="Code hier einfügen"
              className="h-20 min-h-0 p-2 font-mono text-xs"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type="submit" disabled={laeuft}>
        {knopf}
      </Button>
      {fehler && (
        <p role="alert" className="text-sm text-destructive">
          {fehler}
        </p>
      )}
    </form>
  );
}
