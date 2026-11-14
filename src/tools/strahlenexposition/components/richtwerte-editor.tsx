"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/core/db/db";
import { zahlLesen } from "@/lib/zahl";
import { richtwerteSpeichern } from "../repository";
import type { Richtwert } from "../schema";

/** Richtwerte anpassen; gilt für alle Einsätze auf diesem Gerät. */
export function RichtwerteEditor({ richtwerte }: { richtwerte: Richtwert[] }) {
  const [werte, setWerte] = useState(() => richtwerte.map((r) => String(r.grenzeMsv).replace(".", ",")));
  const [meldung, setMeldung] = useState<string | null>(null);

  async function speichern() {
    const zahlen = werte.map(zahlLesen);
    if (zahlen.some((z) => z === null || z <= 0)) {
      setMeldung("Alle Richtwerte müssen positive Zahlen sein.");
      return;
    }
    await richtwerteSpeichern(
      getDb(),
      richtwerte.map((r, i) => ({ ...r, grenzeMsv: zahlen[i]! })),
    );
    setMeldung("Gespeichert.");
  }

  async function zuruecksetzen() {
    await richtwerteSpeichern(getDb(), null);
    setMeldung("Standardwerte wiederhergestellt.");
  }

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Einsatzanlass</th>
            <th className="py-2 pr-3 font-medium">Richtwert (mSv)</th>
            <th className="py-2 font-medium">Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {richtwerte.map((r, i) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-2 pr-3">{r.bezeichnung}</td>
              <td className="py-2 pr-3">
                <Input
                  aria-label={`Richtwert ${r.bezeichnung}`}
                  inputMode="decimal"
                  className="h-10 w-24"
                  value={werte[i]}
                  onChange={(e) => setWerte((alt) => alt.map((w, j) => (j === i ? e.target.value : w)))}
                />
              </td>
              <td className="py-2 text-muted-foreground">{r.hinweis}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void speichern()}>
          Richtwerte speichern
        </Button>
        <Button variant="ghost" onClick={() => void zuruecksetzen()}>
          Standardwerte
        </Button>
      </div>
      {meldung && <p role="status">{meldung}</p>}
    </div>
  );
}
