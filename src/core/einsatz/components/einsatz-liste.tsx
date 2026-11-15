"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileArchive, Lock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/core/db/db";
import { exportHref } from "@/core/export/hooks";
import { t } from "@/i18n";
import { formatDatumZeit } from "@/lib/zeit";
import { useAktiverEinsatz, useEinsaetze } from "../hooks";
import {
  aktivenEinsatzSetzen,
  einsatzAbschliessen,
  einsatzLoeschen,
  einsatzWiederOeffnen,
} from "../repository";
import type { Einsatz } from "../schema";
import { EinsatzFormular } from "./einsatz-formular";
import { einsaetzeSichern } from "./sicherung";

export function EinsatzListe() {
  const einsaetze = useEinsaetze();
  const aktiver = useAktiverEinsatz();
  const [gerade, setGerade] = useState<string | null>(null);

  if (einsaetze === undefined) return null;
  if (einsaetze.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-muted-foreground">{t.einsatz.leer}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {/* Der ausgewählte Einsatz steht immer oben. */}
      {[...einsaetze].sort((a, b) => Number(b.id === aktiver?.id) - Number(a.id === aktiver?.id)).map((einsatz) => (
        <li key={einsatz.id}>
          <EinsatzEintrag
            einsatz={einsatz}
            ausgewaehlt={aktiver?.id === einsatz.id}
            geradeAbgeschlossen={gerade === einsatz.id}
            onAbgeschlossen={() => setGerade(einsatz.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function EinsatzEintrag({
  einsatz,
  ausgewaehlt,
  geradeAbgeschlossen,
  onAbgeschlossen,
}: {
  einsatz: Einsatz;
  ausgewaehlt: boolean;
  geradeAbgeschlossen: boolean;
  onAbgeschlossen: () => void;
}) {
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const db = getDb();
  const abgeschlossen = einsatz.status === "abgeschlossen";

  return (
    <Card
      data-testid="einsatz-eintrag"
      className={ausgewaehlt ? "border-primary ring-2 ring-primary/30" : undefined}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-xl">{einsatz.stichwort}</CardTitle>
          {ausgewaehlt && <Badge>{t.einsatz.ausgewaehlt}</Badge>}
          <Badge variant={abgeschlossen ? "secondary" : "ok"}>
            {abgeschlossen ? t.einsatz.statusAbgeschlossen : t.einsatz.statusAktiv}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
          {einsatz.ort && (
            <>
              <dt>{t.einsatz.ort}</dt>
              <dd className="text-foreground">{einsatz.ort}</dd>
            </>
          )}
          {einsatz.einheit && (
            <>
              <dt>{t.einsatz.einheit}</dt>
              <dd className="text-foreground">{einsatz.einheit}</dd>
            </>
          )}
          <dt>{t.einsatz.beginn}</dt>
          <dd className="text-foreground">{formatDatumZeit(einsatz.beginn)}</dd>
          {einsatz.ende && (
            <>
              <dt>{t.einsatz.ende}</dt>
              <dd className="text-foreground">{formatDatumZeit(einsatz.ende)}</dd>
            </>
          )}
        </dl>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {bearbeiten && (
          <div className="rounded-md border p-3 sm:p-4" data-testid="einsatz-bearbeiten">
            <h3 className="mb-3 font-semibold">{t.einsatz.bearbeitenTitel}</h3>
            <EinsatzFormular
              einsatz={einsatz}
              onGespeichert={() => setBearbeiten(false)}
              onAbbrechen={() => setBearbeiten(false)}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {!ausgewaehlt && (
            <Button variant="secondary" onClick={() => void aktivenEinsatzSetzen(db, einsatz.id)}>
              <CheckCircle2 /> {t.einsatz.auswaehlen}
            </Button>
          )}
          {abgeschlossen ? (
            <Button variant="outline" onClick={() => void einsatzWiederOeffnen(db, einsatz.id)}>
              <RotateCcw /> {t.einsatz.wiederOeffnen}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void einsatzAbschliessen(db, einsatz.id).then(onAbgeschlossen)}
            >
              <Lock /> {t.einsatz.abschliessen}
            </Button>
          )}
          {!bearbeiten && (
            <Button variant="outline" onClick={() => setBearbeiten(true)}>
              <Pencil /> {t.einsatz.bearbeiten}
            </Button>
          )}
          <Button variant="outline" onClick={() => void einsaetzeSichern([einsatz.id])}>
            <Download /> {t.einsatz.exportieren}
          </Button>
          <Link href={exportHref("/app/export/", einsatz.id)} className={buttonVariants({ variant: "outline" })}>
            <FileArchive /> Druck, ZIP, Mail
          </Link>
          {!loeschenFragen && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              <Trash2 /> {t.einsatz.loeschen}
            </Button>
          )}
        </div>

        {geradeAbgeschlossen && abgeschlossen && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn bg-warn/10 p-3">
            <p>{t.einsatz.abgeschlossenHinweis}</p>
            <Button onClick={() => void einsaetzeSichern([einsatz.id])}>
              <Download /> {t.einsatz.jetztSichern}
            </Button>
          </div>
        )}

        {loeschenFragen && (
          <div role="alertdialog" aria-label={t.einsatz.loeschen} className="flex flex-col gap-3 rounded-md border border-destructive p-3">
            <p>{t.einsatz.loeschenFrage}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => void einsatzLoeschen(db, einsatz.id)}>
                <Trash2 /> {t.einsatz.loeschenBestaetigen}
              </Button>
              <Button variant="outline" onClick={() => setLoeschenFragen(false)}>
                {t.einsatz.abbrechen}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
