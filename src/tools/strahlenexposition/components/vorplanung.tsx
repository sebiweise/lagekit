"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { zahlLesen } from "@/lib/zahl";
import { formatDauer } from "@/lib/zeit";
import { maxAufenthaltStunden, odlInMsvProStunde, rechenwegVorplanung, restdosis } from "../logic";
import type { OdlEinheit, Richtwert } from "../schema";
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
  const [odl, setOdl] = useState("");
  const [einheit, setEinheit] = useState<OdlEinheit>("µSv/h");
  const [richtwertId, setRichtwertId] = useState(richtwerte[1]?.id ?? richtwerte[0].id);
  const [bisher, setBisher] = useState("0");
  const [personId, setPersonId] = useState("");

  const person = personen.find((p) => p.id === personId);
  const richtwert = richtwerte.find((r) => r.id === (person?.richtwertId ?? richtwertId)) ?? richtwerte[0];
  const bisherMsv = person ? person.dosisMsv : (zahlLesen(bisher) ?? 0);
  const odlWert = zahlLesen(odl);
  const odlMsvH = odlWert === null ? null : odlInMsvProStunde(odlWert, einheit);
  const stunden = odlMsvH === null ? null : maxAufenthaltStunden(restdosis(bisherMsv, richtwert.grenzeMsv), odlMsvH);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OdlEingabe id="vorplanung-odl" wert={odl} einheit={einheit} onWert={setOdl} onEinheit={setEinheit} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="vorplanung-person">Bisherige Dosis</Label>
        <Select id="vorplanung-person" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">Von Hand eingeben</option>
          {personen.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      {!person && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vorplanung-bisher">Bisherige Dosis (mSv)</Label>
            <Input id="vorplanung-bisher" inputMode="decimal" value={bisher} onChange={(e) => setBisher(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vorplanung-richtwert">Richtwert</Label>
            <Select id="vorplanung-richtwert" value={richtwertId} onChange={(e) => setRichtwertId(e.target.value)}>
              {richtwerte.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.bezeichnung} ({r.grenzeMsv} mSv)
                </option>
              ))}
            </Select>
          </div>
        </>
      )}
      <div className="rounded-md bg-muted p-4 sm:col-span-2" data-testid="vorplanung-ergebnis" aria-live="polite">
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
    </div>
  );
}
