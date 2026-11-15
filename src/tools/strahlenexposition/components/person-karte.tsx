"use client";

import { useState } from "react";
import { Square, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleZeile } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/core/db/db";
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
  personAendern,
  personLoeschen,
} from "../repository";
import type { Aufenthalt, Person, Richtwert } from "../schema";
import { AmpelBadge } from "./ampel-badge";
import { DosimeterFeld } from "./dosimeter-feld";
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
    <Card id={`person-${person.id}`} data-testid="person-karte" data-person={person.name} className="scroll-mt-32">
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
        <Collapsible className="rounded-md border px-3 py-1">
          <CollapsibleZeile className="font-medium">Aufenthalt nachtragen</CollapsibleZeile>
          <CollapsibleContent className="pb-2">
            <div className="mt-3">
              <AufenthaltNachtragen idPrefix={`nachtrag-${person.id}`} personIds={[person.id]} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible className="rounded-md border px-3 py-1">
          <CollapsibleZeile className="font-medium">Richtwert ändern oder Person löschen</CollapsibleZeile>
          <CollapsibleContent className="pb-2">
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Richtwert
                <NativeSelect
                  className="w-full max-w-full sm:max-w-md"
                  value={person.richtwertId}
                  onChange={(e) => void personAendern(db, person.id, { richtwertId: e.target.value })}
                >
                  {richtwerte.map((r) => (
                    <NativeSelectOption key={r.id} value={r.id}>
                      {r.bezeichnung} ({r.grenzeMsv} mSv)
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              {richtwert.hinweis && <p className="text-sm text-muted-foreground">{richtwert.hinweis}</p>}
              {loeschenFragen ? (
                <div className="flex flex-col gap-2 rounded-md border border-destructive p-3">
                  <span className="text-sm">Person mit allen Aufenthalten löschen?</span>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" onClick={() => void personLoeschen(db, person.id)}>
                      Endgültig löschen
                    </Button>
                    <Button variant="outline" onClick={() => setLoeschenFragen(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-fit" onClick={() => setLoeschenFragen(true)}>
                  <Trash2 /> Person löschen
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
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
        <Button
          variant="destructive"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => void aufenthaltBeenden(getDb(), [personId])}
        >
          <Square /> Aufenthalt beenden
        </Button>
      </div>
      <Collapsible className="rounded-md border bg-background px-3 py-1">
        <CollapsibleZeile className="font-medium">Neuer Messwert oder Ortswechsel</CollapsibleZeile>
        <CollapsibleContent className="pb-2">
          <div className="mt-3">
            <AufenthaltStart
              idPrefix={`wechsel-${personId}`}
              personIds={[personId]}
              beschriftung="Neuen Wert übernehmen"
              wechseln
              ortVorgabe={aufenthalt.ort}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
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
    <>
      {/* Handy: je Aufenthalt ein Block statt einer breiten Tabelle. */}
      <ul className="flex flex-col divide-y rounded-md border sm:hidden">
        {aufenthalte.map((a) => (
          <AufenthaltBlock key={a.id} aufenthalt={a} jetzt={jetzt} />
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
      <Table className="min-w-[640px]">
        <TableHeader className="text-muted-foreground">
          <TableRow className="border-b">
            <TableHead className="py-2 pr-3 font-medium">Ort</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Beginn</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Ende</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Dauer</TableHead>
            <TableHead className="py-2 pr-3 font-medium">ODL</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Dosis (berechnet)</TableHead>
            <TableHead className="py-2 pr-3 font-medium">Dosimeter (mSv)</TableHead>
            <TableHead className="py-2 font-medium">
              <span className="sr-only">Aktionen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aufenthalte.map((a) => (
            <AufenthaltZeile key={a.id} aufenthalt={a} jetzt={jetzt} />
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

function AufenthaltZeile({ aufenthalt, jetzt }: { aufenthalt: Aufenthalt; jetzt: Date }) {
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const b = aufenthaltDosis(aufenthalt, jetzt);
  return (
    <TableRow className="border-b align-top" data-testid="aufenthalt-zeile">
      <TableCell className="py-2 pr-3">{aufenthalt.ort}</TableCell>
      <TableCell className="py-2 pr-3 tabular-nums">{formatZeit(aufenthalt.beginn)}</TableCell>
      <TableCell className="py-2 pr-3 tabular-nums">{aufenthalt.ende ? formatZeit(aufenthalt.ende) : "läuft"}</TableCell>
      <TableCell className="py-2 pr-3 tabular-nums">{formatDauer(b.dauerH * 60)}</TableCell>
      <TableCell className="py-2 pr-3 tabular-nums">{formatOdl(aufenthalt.odl, aufenthalt.odlEinheit)}</TableCell>
      <TableCell className="py-2 pr-3">
        <span className="font-mono tabular-nums">{formatDosis(b.dosisMsv)}</span>
        <span className="block font-mono text-xs text-muted-foreground">{rechenweg(b)}</span>
      </TableCell>
      <TableCell className="py-2 pr-3">
        <DosimeterFeld aufenthalt={aufenthalt} aria-label={`Dosimeterwert für ${aufenthalt.ort}`} className="h-10 w-28" />
      </TableCell>
      <TableCell className="py-2">
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
      </TableCell>
    </TableRow>
  );
}

function AufenthaltBlock({ aufenthalt, jetzt }: { aufenthalt: Aufenthalt; jetzt: Date }) {
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const b = aufenthaltDosis(aufenthalt, jetzt);
  return (
    <li className="flex flex-col gap-2 p-3" data-testid="aufenthalt-block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-semibold break-words">{aufenthalt.ort}</span>
        <span className="shrink-0 font-mono text-lg font-semibold tabular-nums">{formatDosis(b.dosisMsv)}</span>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatZeit(aufenthalt.beginn)}–{aufenthalt.ende ? formatZeit(aufenthalt.ende) : "läuft"} ·{" "}
        {formatDauer(b.dauerH * 60)} · {formatOdl(aufenthalt.odl, aufenthalt.odlEinheit)}
      </p>
      <p className="font-mono text-xs break-words text-muted-foreground">{rechenweg(b)}</p>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-sm">
          Dosimeter (mSv)
          <DosimeterFeld aufenthalt={aufenthalt} className="h-11 w-24" />
        </label>
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
      </div>
    </li>
  );
}
