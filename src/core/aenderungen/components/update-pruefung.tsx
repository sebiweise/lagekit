"use client";

import { useState } from "react";
import { AlertTriangle, Database, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { einsaetzeSichern } from "@/core/einsatz/components/sicherung";
import { updateAktivieren, usePwaZustand } from "@/core/pwa/update";
import { t } from "@/i18n";
import { AKTUELLE_VERSION } from "../aktuell";
import { updateUebersicht } from "../version-info";
import { ChangelogListe } from "./changelog-liste";

/**
 * Zeigt vor dem Update, was die wartende Version ändert und ob gespeicherte
 * Daten umgebaut werden. Erst „Jetzt aktualisieren“ aktiviert sie.
 */
export function UpdatePruefung() {
  const pwa = usePwaZustand();
  const [gesichert, setGesichert] = useState(false);
  if (!pwa.updateWartet) return null;

  const neu = pwa.neueVersion;
  const uebersicht = neu ? updateUebersicht(AKTUELLE_VERSION, neu) : null;
  const datenUmbau = uebersicht && (uebersicht.migrationen.length > 0 || uebersicht.datenHinweise.length > 0);
  // Bei Datenumbau oder unbekanntem Inhalt ist „Sicherung“ der hervorgehobene Knopf.
  const warnen = Boolean(!uebersicht || datenUmbau || uebersicht.schemaRueckschritt);

  return (
    <Card className="border-2 border-warn" data-testid="update-pruefung">
      <CardHeader>
        <CardTitle className="text-xl">
          {neu ? t.aenderungen.neueVersionTitel(neu.version) : t.aenderungen.neueVersionUnbekannt}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t.aenderungen.installiert}: {AKTUELLE_VERSION.version} ({AKTUELLE_VERSION.commit})
          {neu && ` → ${neu.version} (${neu.commit})`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!pwa.neueVersionGeladen && <p>{t.aenderungen.neueVersionLaedt}</p>}
        {pwa.neueVersionGeladen && !uebersicht && <p>{t.aenderungen.keineAngaben}</p>}

        {uebersicht && (
          <section
            aria-labelledby="update-daten"
            data-testid="update-daten"
            data-umbau={datenUmbau ? "ja" : "nein"}
            className={
              datenUmbau || uebersicht.schemaRueckschritt
                ? "flex flex-col gap-2 rounded-md border-2 border-warn bg-warn/10 p-4"
                : "flex flex-col gap-2 rounded-md border p-4"
            }
          >
            <h3 id="update-daten" className="flex items-center gap-2 font-semibold">
              <Database className="size-5" /> {t.aenderungen.datenTitel}
            </h3>
            {uebersicht.schemaRueckschritt ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" /> {t.aenderungen.rueckschritt}
              </p>
            ) : !datenUmbau ? (
              <p>{t.aenderungen.datenKeine}</p>
            ) : (
              <>
                {uebersicht.migrationen.length > 0 && (
                  <>
                    <p>
                      {t.aenderungen.datenUmbau(AKTUELLE_VERSION.schemaVersion, neu!.schemaVersion)}
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {uebersicht.migrationen.map((m) => (
                        <li key={m.version}>{m.beschreibung}</li>
                      ))}
                    </ul>
                  </>
                )}
                {uebersicht.datenHinweise.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5">
                    {uebersicht.datenHinweise.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
                <p className="font-medium">{t.aenderungen.datenSicherung}</p>
              </>
            )}
          </section>
        )}

        {uebersicht &&
          (uebersicht.abschnitte.some((a) => a.gruppen.length > 0) ? (
            <ChangelogListe abschnitte={uebersicht.abschnitte} />
          ) : (
            <p>{t.aenderungen.keineNeuenPunkte}</p>
          ))}

        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{t.aenderungen.hinweisEinsatz}</p>
          <p>{t.aenderungen.hinweisSitzung}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={warnen ? "default" : "outline"}
            onClick={() => {
              void einsaetzeSichern().then(() => setGesichert(true));
            }}
            data-testid="update-sichern"
          >
            <Download /> {t.aenderungen.sichern}
            {gesichert && " ✓"}
          </Button>
          <Button
            variant={warnen ? "outline" : "default"}
            disabled={pwa.wirdAktualisiert}
            onClick={updateAktivieren}
            data-testid="update-aktivieren"
          >
            <RefreshCw className={pwa.wirdAktualisiert ? "animate-spin" : undefined} />
            {pwa.wirdAktualisiert ? t.aenderungen.wirdAktualisiert : t.status.updateAktivieren}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
