"use client";

import Link from "next/link";
import { Siren } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { formatDatumZeit } from "@/lib/zeit";
import { useAktiverEinsatz } from "../hooks";

export function AktiverEinsatzKarte() {
  const einsatz = useAktiverEinsatz();

  return (
    <Card data-testid="aktiver-einsatz">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Siren className="size-5" aria-hidden /> {t.einsatz.aktiv}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        {einsatz === undefined ? (
          <span className="text-muted-foreground">…</span>
        ) : einsatz === null ? (
          <p className="text-muted-foreground">{t.einsatz.keinAktiver}</p>
        ) : (
          <div>
            <p className="text-2xl font-semibold">{einsatz.stichwort}</p>
            <p className="text-muted-foreground">
              {[einsatz.ort, einsatz.einheit, `seit ${formatDatumZeit(einsatz.beginn)}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
        <Link href="/einsatz/" className={buttonVariants({ variant: "outline" })}>
          {t.einsatz.zurVerwaltung}
        </Link>
      </CardContent>
    </Card>
  );
}
