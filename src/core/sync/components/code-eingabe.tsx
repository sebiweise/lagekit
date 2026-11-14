"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useCallback, useState, type FormEvent } from "react";
import { Camera, FileUp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QrScanner } from "./qr-scanner";

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
  const [text, setText] = useState("");
  const [scannen, setScannen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const uebernehmen = useCallback(
    async (code: string) => {
      setFehler(null);
      setLaeuft(true);
      try {
        await onCode(code.trim());
        setText("");
        setScannen(false);
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
      } finally {
        setLaeuft(false);
      }
    },
    [onCode],
  );
  const gescannt = useCallback((code: string) => void uebernehmen(code), [uebernehmen]);

  function absenden(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) void uebernehmen(text);
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3" aria-label={beschriftung}>
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
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{beschriftung}</Label>
        <textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Code hier einfügen"
          className="h-20 w-full rounded-md border bg-transparent p-2 font-mono text-xs"
        />
      </div>
      <Button type="submit" disabled={laeuft || !text.trim()}>
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
