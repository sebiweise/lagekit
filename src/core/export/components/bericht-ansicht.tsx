"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import { DruckenKnopf } from "./drucken-knopf";
import { BERICHT_CSS, berichtInhalt } from "../bericht";
import type { AnhangDatei } from "../einsatz-paket";
import { anhaengeSammeln } from "../export-dateien";
import { exportHref, useExportDaten } from "../hooks";

/**
 * Druckansicht des Einsatzberichts. Derselbe Inhalt steckt als
 * `einsatzbericht.html` im ZIP. PDF über „Als PDF speichern“ im Druckdialog.
 */
export function BerichtAnsicht() {
  const daten = useExportDaten();
  const einsatzId = daten?.einsatz.id;
  // Dateiliste der verknüpften Ordner, soweit der Zugriff gerade erlaubt ist.
  const [anhaenge, setAnhaenge] = useState<AnhangDatei[]>([]);
  useEffect(() => {
    if (!einsatzId) return;
    let aktuell = true;
    void anhaengeSammeln(getDb(), einsatzId, { ordner: true, zusaetzlich: [] }).then((s) => {
      if (aktuell) setAnhaenge(s.anhaenge);
    });
    return () => {
      aktuell = false;
    };
  }, [einsatzId]);
  const [jetzt] = useState(() => new Date());

  if (daten === undefined) return null;
  if (daten === null) {
    return (
      <p>
        Kein Einsatz aktiv. <Link href="/einsatz/" className="underline">Einsatz auswählen</Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <DruckenKnopf />
        <Link href={exportHref("/export/", daten.einsatz.id)} className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft /> Zurück zu Export
        </Link>
      </div>
      <style>{BERICHT_CSS}</style>
      <div
        className="rounded-xl border bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none"
        data-testid="einsatzbericht"
        dangerouslySetInnerHTML={{ __html: berichtInhalt(daten, { anhaenge, jetzt }) }}
      />
    </div>
  );
}
