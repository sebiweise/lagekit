"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, FileArchive, FolderOpen, Mail, Printer, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { groesseText } from "@/core/dateien/ordner";
import { OrdnerVerwaltung } from "@/core/dateien/components/ordner-verwaltung";
import { ordnerDesEinsatzes } from "@/core/dateien/repository";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { formatDatumZeit } from "@/lib/zeit";
import { dateiHerunterladen } from "../download";
import { kurzbericht, zeitraumText, type EinsatzDaten } from "../einsatz-paket";
import {
  anhaengeSammeln,
  EXPORT_ARTEN,
  exportArtVorhanden,
  exportDateiErstellen,
  type AnhangSammlung,
  type ExportArt,
} from "../export-dateien";
import { useExportDaten, exportHref } from "../hooks";
import { dateienTeilenMoeglich, dateiTeilen, empfaengerSchema, mailprogrammOeffnen, mailtoLink } from "../mail";

const EMPFAENGER_SCHLUESSEL = "lagekit.mail.empfaenger";
/** Viele Mailserver nehmen nicht mehr an. */
const MAIL_GRENZE = 20 * 1024 * 1024;

function gespeicherterEmpfaenger(): string {
  try {
    return localStorage.getItem(EMPFAENGER_SCHLUESSEL) ?? "";
  } catch {
    return "";
  }
}

const mailFormularSchema = z.object({
  empfaenger: empfaengerSchema,
  anhang: z.custom<ExportArt | "keiner">((wert) => typeof wert === "string" && wert !== ""),
});
type MailFormularWerte = z.infer<typeof mailFormularSchema>;

type Meldung = { art: "ok" | "fehler" | "info"; text: string } | null;

function MeldungAnzeige({ meldung }: { meldung: Meldung }) {
  if (!meldung) return null;
  return (
    <p
      role={meldung.art === "fehler" ? "alert" : "status"}
      className={meldung.art === "fehler" ? "text-destructive" : meldung.art === "ok" ? "text-ok" : undefined}
    >
      {meldung.text}
    </p>
  );
}

function sammlungHinweis(s: AnhangSammlung): string | null {
  const teile: string[] = [];
  if (s.fehlend.length > 0) teile.push(`Ohne Zugriff, daher nicht enthalten: ${s.fehlend.join(", ")}.`);
  if (s.abgeschnitten.length > 0) teile.push(`Nur die ersten 5000 Dateien aus: ${s.abgeschnitten.join(", ")}.`);
  return teile.length > 0 ? teile.join(" ") : null;
}

/**
 * Alles zum Einsatz an einer Stelle: ZIP, Bericht zum Drucken, Versand per
 * Mailprogramm und einzelne Dateien. Funktioniert ohne Netz und ohne Server.
 */
export function EinsatzExport() {
  const daten = useExportDaten();
  if (daten === undefined) return null;
  if (daten === null) {
    return (
      <p>
        Kein Einsatz aktiv. <Link href="/einsatz/" className="underline">Einsatz auswählen</Link>
      </p>
    );
  }
  return <ExportInhalt key={daten.einsatz.id} daten={daten} />;
}

function ExportInhalt({ daten }: { daten: EinsatzDaten }) {
  const db = getDb();
  const { einsatz } = daten;
  const ordner = useLiveQuery(() => ordnerDesEinsatzes(db, einsatz.id), [einsatz.id]);
  // Die Einzel-Druckansichten der Tools zeigen immer den aktiven Einsatz.
  const istAktiv = useAktiverEinsatz()?.id === einsatz.id;
  const [zusaetzlich, setZusaetzlich] = useState<File[]>([]);
  const [mitOrdnern, setMitOrdnern] = useState(true);
  const [fortschritt, setFortschritt] = useState<number | null>(null);
  const [zipMeldung, setZipMeldung] = useState<Meldung>(null);

  const mailForm = useForm({
    resolver: zodResolver(mailFormularSchema),
    defaultValues: { empfaenger: gespeicherterEmpfaenger(), anhang: "pdf" } satisfies MailFormularWerte,
  });
  const [mailMeldung, setMailMeldung] = useState<Meldung>(null);
  const [teilenMoeglich] = useState(dateienTeilenMoeglich);
  const [arbeitet, setArbeitet] = useState(false);

  const ordnerDateien = (ordner ?? []).reduce((s, o) => s + o.dateien.length, 0);
  const ordnerGroesse = (ordner ?? []).reduce((s, o) => s + o.dateien.reduce((t, d) => t + d.groesse, 0), 0);
  const zusatzGroesse = zusaetzlich.reduce((s, d) => s + d.size, 0);
  const geschaetzt = (mitOrdnern ? ordnerGroesse : 0) + zusatzGroesse;

  const betreff = `Lagekit: ${einsatz.stichwort}${einsatz.ort ? `, ${einsatz.ort}` : ""}`;

  /** Erstellt die Datei; beim ZIP mit Ordnern und Anhängen und Fortschritt. */
  async function erstellen(art: ExportArt, setMeldung: (m: Meldung) => void): Promise<File | null> {
    const jetzt = new Date();
    let sammlung: AnhangSammlung = { anhaenge: [], fehlend: [], abgeschnitten: [] };
    if (art === "zip" || art === "bericht" || art === "pdf") {
      sammlung = await anhaengeSammeln(db, einsatz.id, { ordner: mitOrdnern, zusaetzlich });
    }
    try {
      const datei = await exportDateiErstellen(db, art, daten, {
        anhaenge: sammlung.anhaenge,
        jetzt,
        fortschritt: art === "zip" ? setFortschritt : undefined,
      });
      const hinweis = sammlungHinweis(sammlung);
      if (hinweis) setMeldung({ art: "info", text: hinweis });
      return datei;
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
      return null;
    } finally {
      setFortschritt(null);
    }
  }

  async function herunterladen(art: ExportArt, setMeldung: (m: Meldung) => void = setZipMeldung) {
    setArbeitet(true);
    setMeldung(null);
    try {
      const datei = await erstellen(art, setMeldung);
      if (datei) {
        dateiHerunterladen(datei.name, datei, datei.type);
        if (art === "zip") {
          setMeldung({ art: "ok", text: `${datei.name} gespeichert (${groesseText(datei.size)}).` });
        }
      }
    } finally {
      setArbeitet(false);
    }
  }

  function empfaengerMerken(wert: string) {
    try {
      localStorage.setItem(EMPFAENGER_SCHLUESSEL, wert);
    } catch {
      // Ohne Speicher eben nicht merken.
    }
  }

  async function mailOeffnen({ empfaenger, anhang: mailArt }: MailFormularWerte) {
    setArbeitet(true);
    setMailMeldung(null);
    try {
      let anhang: File | null = null;
      if (mailArt !== "keiner") {
        anhang = await erstellen(mailArt, setMailMeldung);
        if (!anhang) return;
        dateiHerunterladen(anhang.name, anhang, anhang.type);
      }
      const text = (anhang ? `Anhang: ${anhang.name}\n\n` : "") + kurzbericht(daten);
      mailprogrammOeffnen(mailtoLink({ an: empfaenger, betreff, text }));
      setMailMeldung({
        art: "info",
        text: anhang
          ? `Das Mailprogramm öffnet sich. ${anhang.name} (${groesseText(anhang.size)}) liegt im Download-Ordner: bitte in der Mail anhängen.${anhang.size > MAIL_GRENZE ? " Achtung: Viele Mailserver nehmen höchstens 20 MB an." : ""}`
          : "Das Mailprogramm öffnet sich mit dem Kurzbericht.",
      });
    } finally {
      setArbeitet(false);
    }
  }

  async function teilen({ anhang: mailArt }: MailFormularWerte) {
    setArbeitet(true);
    setMailMeldung(null);
    try {
      if (mailArt === "keiner") {
        await navigator.share({ title: betreff, text: kurzbericht(daten) }).catch((e: unknown) => {
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        });
        return;
      }
      const anhang = await erstellen(mailArt, setMailMeldung);
      if (!anhang) return;
      const ergebnis = await dateiTeilen(anhang, { betreff, text: kurzbericht(daten) });
      if (ergebnis === "nicht-moeglich") {
        setMailMeldung({ art: "fehler", text: "Dieses Gerät kann die Datei nicht teilen. Bitte „Im Mailprogramm öffnen“ nutzen." });
      }
    } catch (e) {
      setMailMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setArbeitet(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-xl font-semibold break-words" data-testid="export-einsatz">
          {einsatz.stichwort}
        </p>
        <p className="text-muted-foreground">
          {[einsatz.ort, einsatz.einheit, zeitraumText(einsatz)].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileArchive className="size-5" aria-hidden /> Alles als ZIP
            </CardTitle>
            <CardDescription>Eine Datei mit allem, was zum Einsatz gehört. Zum Ablegen, Weitergeben oder Archivieren.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="list-disc pl-5 text-sm">
              <li>Einsatzbericht als PDF und zum Öffnen im Browser</li>
              <li>Einsatztagebuch ({daten.eintraege.length} Einträge) als CSV</li>
              <li>Strahlenexposition ({daten.personen.length} Personen, {daten.aufenthalte.length} Aufenthalte) als CSV</li>
              <li>Suchverlauf externe Tools ({daten.suchen.length}) als CSV</li>
              <li>Lagekit-Sicherung zum Wiedereinlesen</li>
            </ul>
            {ordnerDateien > 0 && (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  checked={mitOrdnern}
                  onChange={(e) => setMitOrdnern(e.target.checked)}
                />
                <span>
                  Dateien aus verknüpften Ordnern mitnehmen ({ordnerDateien} Dateien, {groesseText(ordnerGroesse)})
                </span>
              </label>
            )}
            {zusaetzlich.length > 0 && (
              <p className="text-sm">
                Dazu {zusaetzlich.length} hinzugefügte {zusaetzlich.length === 1 ? "Datei" : "Dateien"} ({groesseText(zusatzGroesse)}), siehe unten.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={arbeitet} onClick={() => void herunterladen("zip")} data-testid="zip-export">
                <Download /> ZIP herunterladen
              </Button>
              {geschaetzt > 0 && <span className="text-sm text-muted-foreground">ca. {groesseText(geschaetzt)}</span>}
            </div>
            {fortschritt !== null && (
              <div className="flex items-center gap-3" role="status">
                <progress className="h-2 w-full max-w-64 accent-primary" value={fortschritt} max={1} />
                <span className="text-sm tabular-nums">{Math.round(fortschritt * 100)} %</span>
              </div>
            )}
            <MeldungAnzeige meldung={zipMeldung} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Printer className="size-5" aria-hidden /> Drucken oder als PDF
            </CardTitle>
            <CardDescription>
              Einsatzbericht mit Einsatzdaten, Tagebuch, Strahlenexposition, Suchverlauf und Dateiliste. Im Druckdialog
              „Als PDF speichern“ wählen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href={exportHref("/export/bericht/", einsatz.id)} className={buttonVariants()}>
              <Printer /> Einsatzbericht öffnen
            </Link>
            <Button variant="outline" disabled={arbeitet} onClick={() => void herunterladen("pdf")} data-testid="pdf-export">
              <Download /> PDF herunterladen
            </Button>
            {istAktiv && daten.eintraege.length > 0 && (
              <Link href="/tools/einsatztagebuch/druck/" className={buttonVariants({ variant: "outline" })}>
                Nur Tagebuch
              </Link>
            )}
            {istAktiv && daten.personen.length > 0 && (
              <Link href="/tools/strahlenexposition/nachweis/" className={buttonVariants({ variant: "outline" })}>
                Dosisnachweise je Person
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Mail className="size-5" aria-hidden /> Per E-Mail senden
            </CardTitle>
            <CardDescription>
              Öffnet das Mailprogramm dieses Geräts mit Betreff und Kurzbericht. Lagekit verschickt selbst nichts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              noValidate
              onSubmit={mailForm.handleSubmit(mailOeffnen)}
              className="flex flex-col gap-4"
              aria-label="Per E-Mail senden"
            >
              <Controller
                name="empfaenger"
                control={mailForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mail-an">Empfänger (optional, mehrere mit Komma)</FieldLabel>
                    <Input
                      {...field}
                      id="mail-an"
                      type="email"
                      multiple
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="leitstelle@beispiel.de"
                      onChange={(e) => {
                        field.onChange(e);
                        empfaengerMerken(e.target.value);
                      }}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="anhang"
                control={mailForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mail-anhang">Anhang (Format)</FieldLabel>
                    <Select {...field} id="mail-anhang" aria-invalid={fieldState.invalid}>
                      {EXPORT_ARTEN.filter((a) => exportArtVorhanden(a.art, daten)).map((a) => (
                        <option key={a.art} value={a.art}>
                          {a.titel}
                        </option>
                      ))}
                      <option value="keiner">Kein Anhang, nur Kurzbericht</option>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={arbeitet} data-testid="mail-oeffnen">
                  <Mail /> Im Mailprogramm öffnen
                </Button>
                {teilenMoeglich && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={arbeitet}
                    onClick={() => void mailForm.handleSubmit(teilen)()}
                    data-testid="mail-teilen"
                  >
                    <Share2 /> Mit Anhang teilen …
                  </Button>
                )}
              </div>
            </form>
            <p className="text-sm text-muted-foreground">
              {teilenMoeglich
                ? "„Mit Anhang teilen“ übergibt die Datei direkt an Mail, Outlook & Co. Beim Mailprogramm-Link wird die Datei gespeichert und muss angehängt werden."
                : "Ein Mail-Link kann keine Datei mitgeben: Die Datei wird gespeichert und muss im Mailprogramm angehängt werden."}
            </p>
            <MeldungAnzeige meldung={mailMeldung} />
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Text der Mail ansehen</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 font-sans whitespace-pre-wrap">
                {kurzbericht(daten)}
              </pre>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Download className="size-5" aria-hidden /> Einzelne Dateien
            </CardTitle>
            <CardDescription>Stand {formatDatumZeit(new Date())}. CSV öffnet in Excel und LibreOffice.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {EXPORT_ARTEN.filter((a) => a.art !== "zip").map((a) => (
              <Button
                key={a.art}
                variant="outline"
                className="justify-start"
                disabled={arbeitet || !exportArtVorhanden(a.art, daten)}
                onClick={() => void herunterladen(a.art)}
              >
                <Download /> {a.kurz}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card id="ordner">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FolderOpen className="size-5" aria-hidden /> Ordner und weitere Dateien
          </CardTitle>
          <CardDescription>
            Zum Beispiel Drohnenaufnahmen, Fotos oder Lagepläne für den ZIP-Export. Ansehen und öffnen im{" "}
            <Link href="/tools/dateien/" className="underline">Dateibrowser</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrdnerVerwaltung einsatzId={einsatz.id} zusaetzlich={zusaetzlich} setZusaetzlich={setZusaetzlich} />
        </CardContent>
      </Card>
    </div>
  );
}
