"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/core/db/db";
import { sitzungen, type GastSitzung } from "../sitzung";
import { CodeEingabe } from "./code-eingabe";
import { QrAnzeige } from "./qr-anzeige";
import { TeilnehmerAngaben } from "./teilnehmer-zeile";

/** Ansicht eines beitretenden Geräts. */
export function SitzungGast({ sitzung }: { sitzung: GastSitzung }) {
  const perQr = sitzung.gespeichert.weg === "qr";
  const ende = sitzung.status === "abgelehnt";
  const getrennt = sitzung.status === "getrennt";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {sitzung.status === "verbunden"
            ? `Verbunden: ${sitzung.einsatz?.stichwort ?? ""}`
            : ende
              ? "Nicht verbunden"
              : getrennt
                ? "Verbindung unterbrochen"
                : "Beitritt läuft"}
        </CardTitle>
        <CardDescription data-testid="gast-status">
          {sitzung.meldung ??
            {
              anfrage: perQr ? "Zeigen Sie dem Host diesen Code." : "Anfrage wird gesendet …",
              "wartet-auf-host": "Warte auf Freigabe durch den Host …",
              verbindet: "Verbindung wird aufgebaut …",
              verbunden: "Änderungen erscheinen auf allen Geräten der Sitzung.",
              getrennt: "Getrennt.",
              abgelehnt: "Abgelehnt.",
            }[sitzung.status]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {sitzung.status === "anfrage" && perQr && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">1. Beitrittscode beim Host scannen lassen</h3>
              <QrAnzeige code={sitzung.anfrageCode} dateiname="lagekit-beitritt.txt" testId="beitrittscode" />
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">2. Antwort des Hosts übernehmen</h3>
              <p className="text-sm text-muted-foreground">Erscheint beim Host, sobald er den Beitritt zulässt.</p>
              <CodeEingabe
                id="gast-antwort"
                beschriftung="Antwortcode des Hosts"
                knopf="Verbinden"
                onCode={(code) => sitzung.antwortSetzen(code)}
              />
            </section>
          </div>
        )}

        {sitzung.status === "verbunden" && (
          <>
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">In der Sitzung</h3>
              <ul className="flex flex-col gap-3">
                {sitzung.teilnehmer.map((t, i) => (
                  <li key={t.geraetId} className="flex items-start justify-between gap-3">
                    <TeilnehmerAngaben teilnehmer={t} />
                    {i === 0 && <Badge variant="secondary">Host</Badge>}
                  </li>
                ))}
              </ul>
            </section>
            <Link href="/" className={buttonVariants({ variant: "outline", className: "self-start" })}>
              Zu den Tools
            </Link>
          </>
        )}

        {getrennt && perQr && (
          <Button
            className="self-start"
            onClick={() => void sitzungen.beitreten(getDb(), sitzung.ich, "qr", "")}
          >
            Erneut beitreten
          </Button>
        )}
        {ende ? (
          <Button className="self-start" onClick={() => sitzungen.setzen(null)}>
            Neu beitreten
          </Button>
        ) : (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              sitzung.verlassen();
              sitzungen.setzen(null);
            }}
          >
            <LogOut /> {sitzung.status === "verbunden" ? "Sitzung verlassen" : "Abbrechen"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
