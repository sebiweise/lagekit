"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import { jsonHerunterladen } from "@/core/export/download";
import {
  exportDateiLesen,
  exportDateiname,
  exportErstellen,
  importieren,
} from "@/core/export/json";
import { t } from "@/i18n";

/** Exportiert die angegebenen Einsätze (oder alle) als JSON-Datei. */
export async function einsaetzeSichern(einsatzIds?: string[]) {
  const datei = await exportErstellen(getDb(), { einsatzIds });
  jsonHerunterladen(exportDateiname(datei.einsaetze), datei);
}

export function Sicherung() {
  const eingabe = useRef<HTMLInputElement>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);

  async function dateiGewaehlt(datei: File | undefined) {
    if (!datei) return;
    setMeldung(null);
    try {
      const ergebnis = await importieren(getDb(), exportDateiLesen(await datei.text()));
      const texte = [
        t.sicherung.importErfolg(
          ergebnis.einsaetzeNeu,
          ergebnis.einsaetzeAktualisiert,
          ergebnis.einsaetzeUnveraendert,
          ergebnis.zeilenNeu,
        ),
      ];
      if (ergebnis.unbekannteTabellen.length > 0) {
        texte.push(t.sicherung.importUnbekannt(ergebnis.unbekannteTabellen.join(", ")));
      }
      setMeldung({ art: "ok", text: texte.join(" ") });
    } catch (e) {
      setMeldung({
        art: "fehler",
        text: `${t.sicherung.importFehler}: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      if (eingabe.current) eingabe.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{t.sicherung.text}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void einsaetzeSichern()}>
          <Download /> {t.sicherung.allesExportieren}
        </Button>
        <Button variant="outline" onClick={() => eingabe.current?.click()}>
          <Upload /> {t.sicherung.importieren}
        </Button>
        <input
          ref={eingabe}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label={t.sicherung.importieren}
          data-testid="import-datei"
          onChange={(e) => void dateiGewaehlt(e.target.files?.[0])}
        />
      </div>
      {meldung && (
        <p
          role={meldung.art === "fehler" ? "alert" : "status"}
          className={meldung.art === "fehler" ? "text-destructive" : "text-ok"}
        >
          {meldung.text}
        </p>
      )}
    </div>
  );
}
