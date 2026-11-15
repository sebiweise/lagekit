"use client";

import { useState } from "react";
import Link from "next/link";
import { FileArchive, Pencil, Plus, Settings2, Siren } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { formatDatumZeit } from "@/lib/zeit";
import { useAktiverEinsatz, useEinsaetze } from "../hooks";
import { EinsatzFormular } from "./einsatz-formular";

/**
 * Oben auf der Lage-Seite. Ohne aktiven Einsatz direkt das Formular zum Anlegen,
 * damit der Einsatz mit einem Schritt beginnt.
 */
export function AktiverEinsatzKarte() {
  const einsatz = useAktiverEinsatz();
  const einsaetze = useEinsaetze();
  const [bearbeiten, setBearbeiten] = useState<string | null>(null);

  if (einsatz === undefined) return <Card data-testid="aktiver-einsatz" className="min-h-32" aria-busy />;

  if (einsatz === null) {
    const offene = einsaetze?.filter((e) => e.status === "aktiv").length ?? 0;
    return (
      <Card data-testid="aktiver-einsatz" className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Plus className="size-6" aria-hidden /> {t.einsatz.neu}
          </CardTitle>
          <CardDescription className="text-base">{t.einsatz.keinAktiver}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <EinsatzFormular />
          {offene > 0 && (
            <Link href="/einsatz/" className={buttonVariants({ variant: "outline" })}>
              Laufenden Einsatz auswählen ({offene})
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  if (bearbeiten === einsatz.id) {
    return (
      <Card data-testid="aktiver-einsatz">
        <CardHeader>
          <CardTitle>{t.einsatz.bearbeitenTitel}</CardTitle>
        </CardHeader>
        <CardContent>
          <EinsatzFormular
            einsatz={einsatz}
            onGespeichert={() => setBearbeiten(null)}
            onAbbrechen={() => setBearbeiten(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="aktiver-einsatz">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Siren className="mt-1 size-7 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t.einsatz.aktiv}</p>
            <p className="text-2xl font-bold break-words">{einsatz.stichwort}</p>
            <p className="text-muted-foreground">
              {[einsatz.ort, einsatz.einheit, `seit ${formatDatumZeit(einsatz.beginn)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/export/" className={buttonVariants({ variant: "outline" })}>
            <FileArchive /> Export, Druck, Mail
          </Link>
          <Button variant="outline" onClick={() => setBearbeiten(einsatz.id)}>
            <Pencil /> {t.einsatz.bearbeiten}
          </Button>
          <Link href="/einsatz/" className={buttonVariants({ variant: "outline" })}>
            <Settings2 /> {t.einsatz.zurVerwaltung}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
