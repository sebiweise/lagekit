"use client";

import { useState } from "react";
import { Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDb } from "@/core/db/db";
import { zahlLesen } from "@/lib/zahl";
import { formatDauer, formatZeit } from "@/lib/zeit";
import {
  ampel,
  aufenthaltDosis,
  dosimeterSumme,
  formatDosis,
  formatOdl,
  gesamtdosis,
  maxAufenthaltStunden,
  rechenweg,
  restdosis,
  richtwertErreichtUm,
} from "../logic";
import {
  aufenthaltBeenden,
  aufenthaltLoeschen,
  dosimeterSetzen,
  personAendern,
  personLoeschen,
} from "../repository";
import type { Aufenthalt, Person, Richtwert } from "../schema";
import { AmpelBadge } from "./ampel-badge";
import { AufenthaltNachtragen } from "./aufenthalt-nachtragen";
import { AufenthaltStart } from "./aufenthalt-start";

export function PersonKarte({
  person,
  aufenthalte,
  richtwerte,
  jetzt,
}: {
  person: Person;
  aufenthalte: Aufenthalt[];
  richtwerte: Richtwert[];
  jetzt: Date;
}) {
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const db = getDb();
  const richtwert = richtwerte.find((r) => r.id === person.richtwertId) ?? richtwerte[0];
  const gesamt = gesamtdosis(aufenthalte, jetzt);
  const gemessen = dosimeterSumme(aufenthalte);
  const laufend = aufenthalte.find((a) => a.ende === null);
  const zustand = ampel(gesamt, richtwert.grenzeMsv, gemessen);
  const rest = restdosis(Math.max(gesamt, gemessen ?? 0), richtwert.grenzeMsv);

  return (
    <Card data-testid="person-karte" data-person={person.name}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{person.name}</CardTitle>
            {person.trupp && <p className="text-sm text-muted-foreground">{person.trupp}</p>}
          </div>
          <AmpelBadge ampel={zustand} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kennzahl titel="Gesamtdosis (berechnet)" wert={formatDosis(gesamt)} testId="gesamtdosis" gross />
          <Kennzahl titel="Dosimeter (Summe)" wert={gemessen === null ? "–" : formatDosis(gemessen)} />
          <Kennzahl titel="Richtwert" wert={`${richtwert.grenzeMsv} mSv`} />
          <Kennzahl titel="Restdosis" wert={formatDosis(rest)} />
        </dl>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {laufend ? (
          <LaufenderAufenthalt aufenthalt={laufend} rest={rest} jetzt={jetzt} personId={person.id} />
        ) : (
          <AufenthaltStart idPrefix={`start-${person.id}`} personIds={[person.id]} beschriftung="Aufenthalt starten" />
        )}

        {aufenthalte.length > 0 && <AufenthaltTabelle aufenthalte={aufenthalte} jetzt={jetzt} />}

        <details className="rounded-md border p-3">
          <summary className="cursor-pointer font-medium">Aufenthalt nachtragen</summary>
          <div className="mt-3">
            <AufenthaltNachtragen idPrefix={`nachtrag-${person.id}`} personIds={[person.id]} />
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Richtwert
            <Select
              className="h-10 w-auto"
              value={person.richtwertId}
              onChange={(e) => void personAendern(db, person.id, { richtwertId: e.target.value })}
            >
              {richtwerte.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.bezeichnung} ({r.grenzeMsv} mSv)
                </option>
              ))}
            </Select>
          </label>
          {richtwert.hinweis && <p className="text-sm text-muted-foreground">{richtwert.hinweis}</p>}
          <div className="ml-auto">
            {loeschenFragen ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Person mit allen Aufenthalten löschen?</span>
                <Button size="sm" variant="destructive" onClick={() => void personLoeschen(db, person.id)}>
                  Endgültig löschen
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLoeschenFragen(false)}>
                  Abbrechen
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setLoeschenFragen(true)}>
                <Trash2 /> Person löschen
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kennzahl({ titel, wert, testId, gross }: { titel: string; wert: string; testId?: string; gross?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{titel}</dt>
      <dd data-testid={testId} className={gross ? "font-mono text-2xl font-semibold tabular-nums" : "font-mono text-lg tabular-nums"}>
        {wert}
      </dd>
    </div>
  );
}

function LaufenderAufenthalt({
  aufenthalt,
  rest,
  jetzt,
  personId,
}: {
  aufenthalt: Aufenthalt;
  rest: number;
  jetzt: Date;
  personId: string;
}) {
  const b = aufenthaltDosis(aufenthalt, jetzt);
  const restStunden = maxAufenthaltStunden(rest, b.odlMsvH);
  const erreicht = richtwertErreichtUm(jetzt, rest, b.odlMsvH);

  return (
    <div className="flex flex-col gap-3 rounded-md border-2 border-warn bg-warn/10 p-4" data-testid="laufender-aufenthalt">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Laufender Aufenthalt seit {formatZeit(aufenthalt.beginn)} · {aufenthalt.ort} ·{" "}
            {formatOdl(aufenthalt.odl, aufenthalt.odlEinheit)}
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums" data-testid="laufende-dosis">
            {formatDosis(b.dosisMsv)}
          </p>
          <p className="font-mono text-sm text-muted-foreground">{rechenweg(b)}</p>
        </div>
        <Button variant="destructive" size="lg" onClick={() => void aufenthaltBeenden(getDb(), [personId])}>
          <Square /> Aufenthalt beenden
        </Button>
      </div>
      <details className="rounded-md border bg-background p-3">
        <summary className="cursor-pointer font-medium">Neuer Messwert oder Ortswechsel</summary>
        <div className="mt-3">
          <AufenthaltStart
            idPrefix={`wechsel-${personId}`}
            personIds={[personId]}
            beschriftung="Neuen Wert übernehmen"
            wechseln
            ortVorgabe={aufenthalt.ort}
          />
        </div>
      </details>
      <p className="text-lg" data-testid="restzeit">
        {restStunden === 0
          ? "Richtwert erreicht: Bereich sofort verlassen."
          : Number.isFinite(restStunden)
            ? `Verbleibende Zeit bis zum Richtwert: ${formatDauer(restStunden * 60)} (um ${formatZeit(erreicht!)} Uhr)`
            : "Keine Dosisleistung: keine Zeitbegrenzung."}
      </p>
    </div>
  );
}

function AufenthaltTabelle({ aufenthalte, jetzt }: { aufenthalte: Aufenthalt[]; jetzt: Date }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Ort</th>
            <th className="py-2 pr-3 font-medium">Beginn</th>
            <th className="py-2 pr-3 font-medium">Ende</th>
            <th className="py-2 pr-3 font-medium">Dauer</th>
            <th className="py-2 pr-3 font-medium">ODL</th>
            <th className="py-2 pr-3 font-medium">Dosis (berechnet)</th>
            <th className="py-2 pr-3 font-medium">Dosimeter (mSv)</th>
            <th className="py-2 font-medium">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {aufenthalte.map((a) => (
            <AufenthaltZeile key={a.id} aufenthalt={a} jetzt={jetzt} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AufenthaltZeile({ aufenthalt, jetzt }: { aufenthalt: Aufenthalt; jetzt: Date }) {
  const [dosimeter, setDosimeter] = useState(
    aufenthalt.dosimeterMsv === null ? "" : String(aufenthalt.dosimeterMsv).replace(".", ","),
  );
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const b = aufenthaltDosis(aufenthalt, jetzt);

  return (
    <tr className="border-b align-top" data-testid="aufenthalt-zeile">
      <td className="py-2 pr-3">{aufenthalt.ort}</td>
      <td className="py-2 pr-3 tabular-nums">{formatZeit(aufenthalt.beginn)}</td>
      <td className="py-2 pr-3 tabular-nums">{aufenthalt.ende ? formatZeit(aufenthalt.ende) : "läuft"}</td>
      <td className="py-2 pr-3 tabular-nums">{formatDauer(b.dauerH * 60)}</td>
      <td className="py-2 pr-3 tabular-nums">{formatOdl(aufenthalt.odl, aufenthalt.odlEinheit)}</td>
      <td className="py-2 pr-3">
        <span className="font-mono tabular-nums">{formatDosis(b.dosisMsv)}</span>
        <span className="block font-mono text-xs text-muted-foreground">{rechenweg(b)}</span>
      </td>
      <td className="py-2 pr-3">
        <Input
          aria-label={`Dosimeterwert für ${aufenthalt.ort}`}
          inputMode="decimal"
          className="h-10 w-28"
          value={dosimeter}
          onChange={(e) => setDosimeter(e.target.value)}
          onBlur={() => void dosimeterSetzen(getDb(), aufenthalt.id, zahlLesen(dosimeter))}
        />
      </td>
      <td className="py-2">
        {loeschenFragen ? (
          <span className="flex gap-1">
            <Button size="sm" variant="destructive" onClick={() => void aufenthaltLoeschen(getDb(), aufenthalt.id)}>
              Löschen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLoeschenFragen(false)}>
              Nein
            </Button>
          </span>
        ) : (
          <Button size="icon" variant="ghost" aria-label="Aufenthalt löschen" onClick={() => setLoeschenFragen(true)}>
            <Trash2 />
          </Button>
        )}
      </td>
    </tr>
  );
}
