"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DruckenKnopf } from "@/core/export/components/drucken-knopf";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { APP_VERSION } from "@/core/version";
import { formatDatumZeit, formatDauer, formatZeit } from "@/lib/zeit";
import { useAufenthalte, usePersonen, useRichtwerte } from "../hooks";
import {
  ampel,
  aufenthaltDosis,
  dosimeterSumme,
  formatDosis,
  formatOdl,
  gesamtdosis,
  rechenweg,
} from "../logic";

const AMPEL_TEXT = { gruen: "unter 80 % des Richtwerts", gelb: "ab 80 % des Richtwerts", rot: "Richtwert erreicht" };

/**
 * Druckansicht: ein Dosisnachweis je Person, jeweils auf eigener Seite.
 * PDF entsteht über den Druckdialog des Browsers; das funktioniert offline.
 */
export function Dosisnachweis() {
  const einsatz = useAktiverEinsatz();
  const personen = usePersonen(einsatz?.id);
  const aufenthalte = useAufenthalte(einsatz?.id);
  const richtwerte = useRichtwerte();

  if (einsatz === undefined) return null;
  if (einsatz === null) {
    return (
      <p>
        Kein Einsatz aktiv. <Link href="/einsatz/">Einsatz auswählen</Link>
      </p>
    );
  }
  if (!personen || !aufenthalte || !richtwerte) return null;
  const erstellt = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <DruckenKnopf />
        <Link href="/tools/strahlenexposition/" className={buttonVariants({ variant: "outline" })}>
          Zurück zur Dosisüberwachung
        </Link>
      </div>

      {personen.length === 0 && <p>Keine Personen erfasst.</p>}

      {personen.map((person) => {
        const liste = aufenthalte.filter((a) => a.personId === person.id);
        const richtwert = richtwerte.find((r) => r.id === person.richtwertId) ?? richtwerte[0];
        const gesamt = gesamtdosis(liste, erstellt);
        const gemessen = dosimeterSumme(liste);
        return (
          <article
            key={person.id}
            data-testid="nachweis-person"
            className="flex flex-col gap-4 break-after-page rounded-xl border p-6 print:rounded-none print:border-0 print:p-0"
          >
            <header className="flex flex-col gap-1 border-b pb-3">
              <p className="text-sm text-muted-foreground">Dosisnachweis · Lagekit {APP_VERSION}</p>
              <h2 className="text-2xl font-bold">{person.name}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Einsatz</dt>
                <dd>{einsatz.stichwort}</dd>
                {einsatz.ort && (
                  <>
                    <dt className="text-muted-foreground">Ort</dt>
                    <dd>{einsatz.ort}</dd>
                  </>
                )}
                {einsatz.einheit && (
                  <>
                    <dt className="text-muted-foreground">Einheit</dt>
                    <dd>{einsatz.einheit}</dd>
                  </>
                )}
                {person.trupp && (
                  <>
                    <dt className="text-muted-foreground">Trupp</dt>
                    <dd>{person.trupp}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Zeitraum</dt>
                <dd>
                  {formatDatumZeit(einsatz.beginn)} bis {einsatz.ende ? formatDatumZeit(einsatz.ende) : "laufend"}
                </dd>
                <dt className="text-muted-foreground">Richtwert</dt>
                <dd>
                  {richtwert.bezeichnung}: {richtwert.grenzeMsv} mSv
                </dd>
              </dl>
            </header>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2 font-medium">Ort</th>
                  <th className="py-1 pr-2 font-medium">Beginn</th>
                  <th className="py-1 pr-2 font-medium">Ende</th>
                  <th className="py-1 pr-2 font-medium">Dauer</th>
                  <th className="py-1 pr-2 font-medium">ODL</th>
                  <th className="py-1 pr-2 font-medium">Dosis (berechnet)</th>
                  <th className="py-1 font-medium">Dosimeter</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((a) => {
                  const b = aufenthaltDosis(a, erstellt);
                  return (
                    <tr key={a.id} className="border-b align-top">
                      <td className="py-1 pr-2">{a.ort}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatDatumZeit(a.beginn)}</td>
                      <td className="py-1 pr-2 tabular-nums">{a.ende ? formatZeit(a.ende) : `läuft (Stand ${formatZeit(erstellt)})`}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatDauer(b.dauerH * 60)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatOdl(a.odl, a.odlEinheit)}</td>
                      <td className="py-1 pr-2">
                        <span className="font-mono">{formatDosis(b.dosisMsv)}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{rechenweg(b)}</span>
                      </td>
                      <td className="py-1 font-mono">{a.dosimeterMsv === null ? "–" : formatDosis(a.dosimeterMsv)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-2 pr-2" colSpan={5}>
                    Gesamt
                  </td>
                  <td className="py-2 pr-2 font-mono" data-testid="nachweis-gesamt">
                    {formatDosis(gesamt)}
                  </td>
                  <td className="py-2 font-mono">{gemessen === null ? "–" : formatDosis(gemessen)}</td>
                </tr>
              </tfoot>
            </table>

            <p className="text-sm">
              Bewertung: {AMPEL_TEXT[ampel(gesamt, richtwert.grenzeMsv, gemessen)]}. Berechnung D = Ḣ × t je Aufenthalt bei
              gleichbleibender Ortsdosisleistung.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
              <div className="border-t pt-1">Datum, Unterschrift Einsatzkraft</div>
              <div className="border-t pt-1">Datum, Unterschrift Einsatzleitung / Strahlenschutz</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Erstellt am {formatDatumZeit(erstellt)}. Hilfsmittel zur Dokumentation, ersetzt keine amtliche Dosimetrie.
            </p>
          </article>
        );
      })}
    </div>
  );
}
