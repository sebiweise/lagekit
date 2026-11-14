"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { LogIn, Radio } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { cn } from "@/lib/utils";
import { ichLesen, ichSpeichern } from "../ich";
import type { Teilnehmer } from "../protokoll";
import { sitzungen } from "../sitzung";
import { vermittlung } from "../vermittlung";
import { IchFormular } from "./ich-formular";

type Weg = "kurzcode" | "qr";

/** Noch keine Sitzung: selbst leiten oder einer Sitzung beitreten. */
export function SitzungStart() {
  const einsatz = useAktiverEinsatz();
  const [ich, setIch] = useState<Teilnehmer | null>(null);
  const [weg, setWeg] = useState<Weg>("kurzcode");
  const [kurzcode, setKurzcode] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    void ichLesen(getDb()).then(setIch);
  }, []);

  if (!ich || einsatz === undefined) return null;

  async function ausfuehren(aktion: (ich: Teilnehmer) => Promise<void>) {
    setFehler(null);
    setLaeuft(true);
    try {
      await aktion(await ichSpeichern(getDb(), ich!));
    } catch (e) {
      setFehler(e instanceof Error ? e.message.replace(/^\[.*$/s, "Bitte einen Namen angeben.") : String(e));
    } finally {
      setLaeuft(false);
    }
  }

  function leiten() {
    void ausfuehren(async (ich) => {
      if (!einsatz) return;
      sitzungen.leiten(getDb(), einsatz, ich, vermittlung);
    });
  }

  function beitreten(e: FormEvent) {
    e.preventDefault();
    void ausfuehren(async (ich) => {
      await sitzungen.beitreten(getDb(), ich, weg, kurzcode, vermittlung);
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
          <IchFormular ich={ich} onAendern={setIch} />
        </CardContent>
      </Card>

      {fehler && (
        <p role="alert" className="text-destructive">
          {fehler}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
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
                <Button onClick={leiten} disabled={laeuft} className="self-start">
                  <Radio /> Sitzung starten
                </Button>
              </>
            ) : (
              <Link href="/einsatz/" className={buttonVariants({ className: "self-start" })}>
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
            <form onSubmit={beitreten} className="flex flex-col gap-4">
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
                    onClick={() => setWeg(wert)}
                    className={cn(
                      "h-11 rounded-md px-2 text-sm font-medium",
                      weg === wert ? "bg-background shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {text}
                  </button>
                ))}
              </div>
              {weg === "kurzcode" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="kurzcode">Kurzcode vom Host</Label>
                  <Input
                    id="kurzcode"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="123 456"
                    value={kurzcode}
                    onChange={(e) => setKurzcode(e.target.value)}
                    className="font-mono text-2xl tracking-widest"
                  />
                  <p className="text-sm text-muted-foreground">
                    Braucht kurz Internet für den Verbindungsaufbau. Beide Geräte müssen im selben WLAN sein.
                  </p>
                </div>
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
