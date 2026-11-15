"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Download, Printer, Square, UserPlus, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { csvHerunterladen } from "@/core/export/download";
import { useJetzt } from "@/lib/use-jetzt";
import { dosisCsv, dosisCsvDateiname } from "../export";
import { useAufenthalte, usePersonen, useRichtwerte } from "../hooks";
import { gesamtdosis } from "../logic";
import { aufenthaltBeenden } from "../repository";
import type { Aufenthalt, Person } from "../schema";
import { AufenthaltNachtragen } from "./aufenthalt-nachtragen";
import { AufenthaltStart } from "./aufenthalt-start";
import { PersonFormular } from "./person-formular";
import { PersonKarte } from "./person-karte";
import { RichtwerteEditor } from "./richtwerte-editor";
import { Uebersicht } from "./uebersicht";
import { Vorplanung } from "./vorplanung";

export function Strahlenexposition() {
  const einsatz = useAktiverEinsatz();
  const personen = usePersonen(einsatz?.id);
  const aufenthalte = useAufenthalte(einsatz?.id);
  const richtwerte = useRichtwerte();
  const jetzt = useJetzt();

  if (einsatz === undefined || !jetzt) return null;
  if (einsatz === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kein Einsatz aktiv</CardTitle>
          <CardDescription>Die Dosisüberwachung speichert ihre Daten im aktiven Einsatz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/einsatz/" className={buttonVariants()}>
            Einsatz anlegen oder auswählen
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (!personen || !aufenthalte || !richtwerte) return null;

  const jePerson = new Map<string, Aufenthalt[]>();
  for (const a of aufenthalte) jePerson.set(a.personId, [...(jePerson.get(a.personId) ?? []), a]);
  const trupps = gruppiereTrupps(personen);

  return (
    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem] 2xl:grid-rows-[auto_1fr] 2xl:items-start">
      {/* Am breiten Bildschirm: Personen links, Übersicht und Steuerung rechts daneben. */}
      <div className="flex flex-col gap-6 2xl:col-start-2 2xl:row-start-1">
        {personen.length > 0 && (
          <section aria-labelledby="uebersicht-titel" className="flex flex-col gap-3">
            <h2 id="uebersicht-titel" className="text-xl font-semibold">
              Übersicht
            </h2>
            <Uebersicht personen={personen} jePerson={jePerson} richtwerte={richtwerte} jetzt={jetzt} />
          </section>
        )}

        <PersonAnlegen anfangsOffen={personen.length === 0}>
          <PersonFormular einsatzId={einsatz.id} richtwerte={richtwerte} trupps={[...trupps.keys()].filter(Boolean)} />
        </PersonAnlegen>

        {[...trupps.entries()]
          .filter(([trupp, mitglieder]) => trupp && mitglieder.length > 1)
          .map(([trupp, mitglieder], index) => {
            const laufendeIds = mitglieder
              .filter((p) => jePerson.get(p.id)?.some((a) => a.ende === null))
              .map((p) => p.id);
            return (
              <Card key={trupp} data-testid="trupp-steuerung">
                <CardHeader>
                  <CardTitle>Trupp {trupp}</CardTitle>
                  <CardDescription>{mitglieder.map((p) => p.name).join(", ")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {laufendeIds.length < mitglieder.length && (
                    <AufenthaltStart
                      idPrefix={`trupp-${index}`}
                      personIds={mitglieder.map((p) => p.id)}
                      beschriftung="Trupp starten"
                    />
                  )}
                  {laufendeIds.length > 0 && (
                    <>
                      <Button variant="destructive" size="lg" className="w-full sm:w-auto" onClick={() => void aufenthaltBeenden(getDb(), laufendeIds)}>
                        <Square /> Trupp beenden ({laufendeIds.length})
                      </Button>
                      <details className="rounded-md border p-3">
                        <summary className="cursor-pointer font-medium">Neuer Messwert oder Ortswechsel für den Trupp</summary>
                        <div className="mt-3">
                          <AufenthaltStart
                            idPrefix={`trupp-${index}-wechsel`}
                            personIds={laufendeIds}
                            beschriftung="Neuen Wert für den Trupp übernehmen"
                            wechseln
                            ortVorgabe={aufenthaltOrt(jePerson, laufendeIds[0])}
                          />
                        </div>
                      </details>
                    </>
                  )}
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer font-medium">Aufenthalt für den Trupp nachtragen</summary>
                    <div className="mt-3">
                      <AufenthaltNachtragen idPrefix={`trupp-${index}-nachtrag`} personIds={mitglieder.map((p) => p.id)} />
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <section aria-labelledby="personen-titel" className="flex flex-col gap-4 2xl:col-start-1 2xl:row-span-2 2xl:row-start-1">
        <h2 id="personen-titel" className="text-xl font-semibold">
          Personen ({personen.length})
        </h2>
        {personen.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
            Noch keine Personen. Legen Sie die Einsatzkräfte an, die in den Gefahrenbereich gehen.
          </p>
        ) : (
          personen.map((person) => (
            <PersonKarte
              key={person.id}
              person={person}
              aufenthalte={jePerson.get(person.id) ?? []}
              richtwerte={richtwerte}
              jetzt={jetzt}
            />
          ))
        )}
      </section>

      <div className="flex flex-col gap-6 2xl:col-start-2 2xl:row-start-2">
        <Card>
          <CardHeader>
            <CardTitle>Vorplanung</CardTitle>
            <CardDescription>Wie lange darf ein Trupp bei gegebener ODL bleiben?</CardDescription>
          </CardHeader>
          <CardContent>
            <Vorplanung
              richtwerte={richtwerte}
              personen={personen.map((p) => ({
                id: p.id,
                name: p.name,
                richtwertId: p.richtwertId,
                dosisMsv: gesamtdosis(jePerson.get(p.id) ?? [], jetzt),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nachweis und Export</CardTitle>
            <CardDescription>
              Dosisnachweis zum Drucken oder als PDF, Gesamtübersicht als CSV. Die vollständige Sicherung (JSON) gibt es unter
              „Einsatz“.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/tools/strahlenexposition/nachweis/" className={buttonVariants({ variant: "outline" })}>
              <Printer /> Dosisnachweis (PDF)
            </Link>
            <Button
              variant="outline"
              onClick={() => csvHerunterladen(dosisCsvDateiname(einsatz), dosisCsv(personen, aufenthalte, richtwerte, new Date()))}
            >
              <Download /> Gesamtübersicht (CSV)
            </Button>
          </CardContent>
        </Card>

        <p className="rounded-md border border-warn bg-warn/10 p-3 text-sm">
          Hilfsmittel zur Dokumentation. Ersetzt weder Dosimeter noch die Entscheidung der Einsatzleitung. Die Rechnung
          setzt eine gleichbleibende Ortsdosisleistung je Aufenthalt voraus.
        </p>

        <details className="rounded-xl border p-5">
          <summary className="cursor-pointer text-lg font-semibold">Richtwerte einstellen</summary>
          <div className="mt-4">
            <RichtwerteEditor key={richtwerte.map((r) => r.grenzeMsv).join("|")} richtwerte={richtwerte} />
          </div>
        </details>
      </div>
    </div>
  );
}

function aufenthaltOrt(jePerson: Map<string, Aufenthalt[]>, personId: string): string {
  return jePerson.get(personId)?.find((a) => a.ende === null)?.ort ?? "";
}

function gruppiereTrupps(personen: Person[]) {
  const trupps = new Map<string, Person[]>();
  for (const p of personen) trupps.set(p.trupp, [...(trupps.get(p.trupp) ?? []), p]);
  return trupps;
}

/** Neue Personen anlegen. Sind schon Personen erfasst, bleibt das Formular hinter einem Knopf. */
function PersonAnlegen({ anfangsOffen, children }: { anfangsOffen: boolean; children: ReactNode }) {
  const [offen, setOffen] = useState(anfangsOffen);
  if (!offen) {
    return (
      <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setOffen(true)}>
        <UserPlus /> Person anlegen
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Person anlegen</CardTitle>
        {!anfangsOffen && (
          <Button variant="ghost" size="icon" aria-label="Formular schließen" onClick={() => setOffen(false)}>
            <X />
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
