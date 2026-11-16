"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useState } from "react";
import { Check, Power, Unplug, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnfrage } from "@/core/befehle/anfrage";
import { formatZeit } from "@/lib/zeit";
import { sitzungen, type GastStatus, type HostGast, type HostSitzung } from "../sitzung";
import { useKurzcodeDienst } from "../dienst-konfiguration";
import { CodeEingabe } from "./code-eingabe";
import { DienstHinweis } from "./dienst-hinweis";
import { QrAnzeige } from "./qr-anzeige";
import { TeilnehmerAngaben } from "./teilnehmer-zeile";

const STATUS: Record<GastStatus, { text: string; variant: "warn" | "secondary" | "ok" | "outline" | "destructive" }> = {
  "wartet-auf-freigabe": { text: "wartet auf Freigabe", variant: "warn" },
  verbindet: { text: "verbindet", variant: "secondary" },
  verbunden: { text: "verbunden", variant: "ok" },
  getrennt: { text: "getrennt", variant: "outline" },
  abgelehnt: { text: "abgelehnt", variant: "destructive" },
};

/** Ansicht des Hosts: Kurzcode, Aufnahme per QR-Code und Freigabe der Geräte. */
export function SitzungHost({ sitzung }: { sitzung: HostSitzung }) {
  const dienst = useKurzcodeDienst();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Sitzung für „{sitzung.einsatz.stichwort}“</CardTitle>
            <CardDescription>
              Sie leiten die Sitzung. Jedes Gerät erscheint unten mit Name, Funktion und Gerät und erhält erst nach Ihrer
              Freigabe Zugriff auf den Einsatz.
            </CardDescription>
          </div>
          <SitzungBeenden sitzung={sitzung} />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-2" aria-labelledby="kurzcode-titel">
            <h3 id="kurzcode-titel" className="font-semibold">
              Beitreten mit Kurzcode (Internet)
            </h3>
            {!sitzung.kurzcodeMoeglich ? (
              <p className="text-sm text-muted-foreground" data-testid="kurzcode-aus">
                Kurzcode ist in dieser Installation ausgeschaltet. Geräte treten mit QR-Code bei.
              </p>
            ) : sitzung.kurzcode ? (
              <p className="font-mono text-5xl font-bold tracking-widest tabular-nums" data-testid="kurzcode">
                {sitzung.kurzcode.slice(0, 3)} {sitzung.kurzcode.slice(3)}
              </p>
            ) : sitzung.kurzcodeFehler ? (
              <p className="text-sm text-muted-foreground">
                Kein Kurzcode: {sitzung.kurzcodeFehler}{" "}
                <Button variant="link" className="h-auto p-0" onClick={() => void sitzung.kurzcodeAnfordern()}>
                  Erneut versuchen
                </Button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Kurzcode wird angefordert …</p>
            )}
            {sitzung.kurzcodeMoeglich && (
              <>
                <p className="text-sm text-muted-foreground">
                  Über das Internet läuft nur der Verbindungsaufbau. Die Einsatzdaten gehen direkt im lokalen Netz.
                </p>
                {dienst && <DienstHinweis dienst={dienst} />}
              </>
            )}
          </section>
          <section className="flex flex-col gap-2" aria-labelledby="qr-titel">
            <h3 id="qr-titel" className="font-semibold">
              Beitreten mit QR-Code (offline)
            </h3>
            <CodeEingabe
              id="host-anfrage"
              beschriftung="Beitrittscode des Geräts"
              knopf="Anfrage prüfen"
              onCode={async (code) => {
                await sitzung.anfrageAufnehmen(code, "qr");
              }}
            />
          </section>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="geraete-titel">
        <h2 id="geraete-titel" className="text-2xl font-semibold">
          Geräte ({sitzung.verbunden.length} verbunden)
        </h2>
        {sitzung.gaeste.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">Noch keine Beitrittsanfragen.</p>
        )}
        {[...sitzung.gaeste].reverse().map((gast) => (
          <GastKarte key={gast.anfrageId} sitzung={sitzung} gast={gast} />
        ))}
      </section>
    </div>
  );
}

/**
 * Beendet die Sitzung nach Rückfrage: trennt alle Geräte und löscht den Kurzcode beim
 * Vermittlungsdienst. Auch über die Befehlspalette erreichbar.
 */
function SitzungBeenden({ sitzung }: { sitzung: HostSitzung }) {
  const [offen, setOffen] = useState(false);
  useAnfrage("sitzung-beenden", () => setOffen(true));
  const verbunden = sitzung.verbunden.length;
  return (
    <AlertDialog open={offen} onOpenChange={setOffen}>
      <AlertDialogTrigger render={<Button variant="destructive" className="shrink-0" />}>
        <Power /> Sitzung beenden
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sitzung beenden?</AlertDialogTitle>
          <AlertDialogDescription>
            {verbunden === 1 ? "Das verbundene Gerät wird" : verbunden > 1 ? `Alle ${verbunden} verbundenen Geräte werden` : "Alle Geräte werden"}{" "}
            getrennt, und der Kurzcode wird gelöscht. Neue Geräte können erst wieder beitreten, wenn Sie eine neue
            Sitzung starten. Der Einsatz bleibt auf allen Geräten gespeichert.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              sitzung.beenden();
              sitzungen.setzen(null);
            }}
          >
            <Power /> Sitzung beenden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GastKarte({ sitzung, gast }: { sitzung: HostSitzung; gast: HostGast }) {
  const status = STATUS[gast.status];
  return (
    <Card data-testid="gast" data-gast={gast.teilnehmer.name}>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TeilnehmerAngaben teilnehmer={gast.teilnehmer} />
          <div className="flex flex-col items-end gap-1">
            <Badge variant={status.variant}>{status.text}</Badge>
            <span className="text-xs text-muted-foreground">
              {gast.wiederverbunden && "wieder aufgenommen, "}
              {gast.quelle === "kurzcode" ? "per Kurzcode" : "per QR-Code"}, {formatZeit(gast.angekommenAm.toISOString())}{" "}
              Uhr
            </span>
          </div>
        </div>
        {gast.status === "wartet-auf-freigabe" && <Freigabe sitzung={sitzung} gast={gast} />}
        {gast.status === "verbindet" && gast.antwortCode && (
          <div className="flex flex-col gap-2">
            <p>Dieses Gerät scannt jetzt den Antwortcode:</p>
            <QrAnzeige code={gast.antwortCode} dateiname="lagekit-antwort.txt" testId="antwortcode" />
          </div>
        )}
        {gast.status === "verbunden" && (
          <div>
            <Button variant="outline" onClick={() => sitzung.trennen(gast.anfrageId)}>
              <Unplug /> Trennen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Zulassen oder Ablehnen einer Anfrage; wird auch im Hinweis auf allen Seiten genutzt. */
export function Freigabe({ sitzung, gast }: { sitzung: HostSitzung; gast: HostGast }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => void sitzung.zulassen(gast.anfrageId)}>
        <Check /> Zulassen
      </Button>
      <Button variant="outline" onClick={() => void sitzung.ablehnen(gast.anfrageId)}>
        <X /> Ablehnen
      </Button>
    </div>
  );
}
