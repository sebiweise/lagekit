import type { LagekitDB } from "@/core/db/db";
import type { Einsatz } from "@/core/einsatz/schema";
import { koordinatenText } from "@/core/standort/standort";
import { utmref } from "@/core/standort/utmref";
import { APP_VERSION } from "@/core/version";
import { formatDatumZeit, formatZeit } from "@/lib/zeit";
import { tagebuchCsv } from "@/tools/einsatztagebuch/export";
import { chronologisch, korrekturen } from "@/tools/einsatztagebuch/logic";
import { eintraege as eintraegeTabelle } from "@/tools/einsatztagebuch/repository";
import type { Eintrag } from "@/tools/einsatztagebuch/schema";
import { suchverlaufCsv } from "@/tools/recherche/export";
import { verlaufSortieren } from "@/tools/recherche/logic";
import { suchen as suchenTabelle } from "@/tools/recherche/repository";
import type { Suche } from "@/tools/recherche/schema";
import { dosisCsv } from "@/tools/strahlenexposition/export";
import { ampel, dosimeterSumme, formatDosis, gesamtdosis, type Ampel } from "@/tools/strahlenexposition/logic";
import { aufenthalte as aufenthalteTabelle, personen as personenTabelle, richtwerteLesen } from "@/tools/strahlenexposition/repository";
import type { Aufenthalt, Person, Richtwert } from "@/tools/strahlenexposition/schema";
import { berichtHtml } from "./bericht";
import { dateinamenTeil, exportErstellen, type ExportDatei } from "./json";
import type { ZipEintrag } from "./zip";

/** Alles, was zu einem Einsatz gehört, für Bericht, ZIP und Mail. */
export interface EinsatzDaten {
  einsatz: Einsatz;
  eintraege: Eintrag[];
  personen: Person[];
  aufenthalte: Aufenthalt[];
  richtwerte: Richtwert[];
  suchen: Suche[];
}

export async function einsatzDatenLaden(db: LagekitDB, einsatzId: string): Promise<EinsatzDaten | null> {
  const einsatz = await db.einsaetze.get(einsatzId);
  if (!einsatz) return null;
  const [eintraege, personen, aufenthalte, richtwerte, suchen] = await Promise.all([
    eintraegeTabelle(db).where("einsatzId").equals(einsatzId).toArray(),
    personenTabelle(db).where("einsatzId").equals(einsatzId).sortBy("name"),
    aufenthalteTabelle(db).where("einsatzId").equals(einsatzId).sortBy("beginn"),
    richtwerteLesen(db),
    suchenTabelle(db).where("einsatzId").equals(einsatzId).toArray(),
  ]);
  return { einsatz, eintraege, personen, aufenthalte, richtwerte, suchen: verlaufSortieren(suchen) };
}

/** Eine Datei, die zusätzlich ins ZIP kommt, z. B. aus einem verknüpften Ordner. */
export interface AnhangDatei {
  /** Gruppe im Archiv, meist der Ordnername. */
  ordner: string;
  pfad: string;
  datei: Blob;
  groesse: number;
  geaendert: number;
}

export interface DosisZeile {
  person: Person;
  richtwert: Richtwert;
  dosisMsv: number;
  dosimeterMsv: number | null;
  ampel: Ampel;
  aufenthalte: Aufenthalt[];
}

export function dosisUebersicht(daten: EinsatzDaten, jetzt: Date): DosisZeile[] {
  return daten.personen.map((person) => {
    const liste = daten.aufenthalte.filter((a) => a.personId === person.id);
    const richtwert = daten.richtwerte.find((r) => r.id === person.richtwertId) ?? daten.richtwerte[0];
    const dosisMsv = gesamtdosis(liste, jetzt);
    const dosimeterMsv = dosimeterSumme(liste);
    return { person, richtwert, dosisMsv, dosimeterMsv, ampel: ampel(dosisMsv, richtwert.grenzeMsv, dosimeterMsv), aufenthalte: liste };
  });
}

export function zeitraumText(einsatz: Einsatz): string {
  return `${formatDatumZeit(einsatz.beginn)} bis ${einsatz.ende ? formatDatumZeit(einsatz.ende) : "laufend"}`;
}

export function ortText(einsatz: Einsatz): string {
  if (!einsatz.koordinaten) return einsatz.ort;
  const { lat, lon } = einsatz.koordinaten;
  const punkt = [koordinatenText(einsatz.koordinaten), utmref(lat, lon)].filter(Boolean).join(" · ");
  return einsatz.ort ? `${einsatz.ort} (${punkt})` : punkt;
}

const AMPEL_KURZ: Record<Ampel, string> = { gruen: "unter 80 %", gelb: "ab 80 %", rot: "Richtwert erreicht" };
export const AMPEL_TEXT: Record<Ampel, string> = {
  gruen: "unter 80 % des Richtwerts",
  gelb: "ab 80 % des Richtwerts",
  rot: "Richtwert erreicht",
};

/**
 * Kurzbericht als reiner Text, für den Text einer E-Mail. Hält sich kurz, damit
 * er auch über einen mailto-Link ins Mailprogramm passt.
 */
export function kurzbericht(daten: EinsatzDaten, jetzt: Date = new Date()): string {
  const { einsatz } = daten;
  const zeilen = [
    `Einsatz: ${einsatz.stichwort}`,
    einsatz.ort || einsatz.koordinaten ? `Ort: ${ortText(einsatz)}` : null,
    einsatz.einheit ? `Einheit: ${einsatz.einheit}` : null,
    `Zeitraum: ${zeitraumText(einsatz)}`,
    `Stand: ${formatDatumZeit(jetzt)}`,
  ].filter((z): z is string => z !== null);

  const dosis = dosisUebersicht(daten, jetzt);
  if (dosis.length > 0) {
    zeilen.push("", "Strahlenexposition:");
    for (const d of dosis) {
      const gemessen = d.dosimeterMsv === null ? "" : `, Dosimeter ${formatDosis(d.dosimeterMsv)}`;
      zeilen.push(`- ${d.person.name}${d.person.trupp ? ` (${d.person.trupp})` : ""}: ${formatDosis(d.dosisMsv)}${gemessen}, ${AMPEL_KURZ[d.ampel]} von ${d.richtwert.grenzeMsv} mSv`);
    }
  }

  if (daten.eintraege.length > 0) {
    const ersetzt = korrekturen(daten.eintraege);
    const letzte = chronologisch(daten.eintraege)
      .filter((e) => !ersetzt.has(e.id))
      .slice(-5);
    zeilen.push("", `Einsatztagebuch (${daten.eintraege.length} Einträge, die letzten ${letzte.length}):`);
    for (const e of letzte) zeilen.push(`${e.nr}. ${formatZeit(e.zeitpunkt)} ${e.art}: ${e.inhalt}`);
  }

  zeilen.push("", `Erstellt mit Lagekit ${APP_VERSION}`);
  return zeilen.join("\n");
}

export function paketDateiname(einsatz: Einsatz, jetzt: Date = new Date(), endung = "zip"): string {
  return `lagekit-${jetzt.toISOString().slice(0, 10)}-${dateinamenTeil(einsatz.stichwort)}.${endung}`;
}

function liesMich(daten: EinsatzDaten, anhaenge: AnhangDatei[], jetzt: Date, dateien: string[]): string {
  return [
    `Lagekit-Export: ${daten.einsatz.stichwort}`,
    `Erstellt am ${formatDatumZeit(jetzt)} mit Lagekit ${APP_VERSION}.`,
    "",
    "Inhalt:",
    ...dateien.map((d) => `- ${d}`),
    anhaenge.length > 0 ? `- dateien/: ${anhaenge.length} Dateien aus verknüpften Ordnern und Anhängen` : null,
    "",
    "einsatzbericht.pdf ist der Bericht zum Drucken und Weitergeben; einsatzbericht.html zeigt denselben Inhalt im Browser.",
    "Die CSV-Dateien öffnen Excel und LibreOffice (Trennzeichen Semikolon).",
    "sicherung.json kann in Lagekit unter Einsätze > Importieren wieder eingelesen werden.",
    "",
  ]
    .filter((z) => z !== null)
    .join("\r\n");
}

/** Alle Dateien für das ZIP eines Einsatzes. */
export function paketInhalt(
  daten: EinsatzDaten,
  sicherung: ExportDatei,
  anhaenge: AnhangDatei[],
  jetzt: Date = new Date(),
  pdf?: Blob,
): ZipEintrag[] {
  const eintraege: ZipEintrag[] = [
    ...(pdf ? [{ pfad: "einsatzbericht.pdf", inhalt: pdf }] : []),
    { pfad: "einsatzbericht.html", inhalt: berichtHtml(daten, { anhaenge, jetzt }) },
    { pfad: "sicherung.json", inhalt: JSON.stringify(sicherung, null, 2) },
  ];
  if (daten.eintraege.length > 0) eintraege.push({ pfad: "einsatztagebuch.csv", inhalt: tagebuchCsv(daten.eintraege) });
  if (daten.aufenthalte.length > 0) {
    eintraege.push({ pfad: "strahlenexposition.csv", inhalt: dosisCsv(daten.personen, daten.aufenthalte, daten.richtwerte, jetzt) });
  }
  if (daten.suchen.length > 0) eintraege.push({ pfad: "suchverlauf.csv", inhalt: suchverlaufCsv(daten.suchen) });

  const dateien = eintraege.map((e) => e.pfad);
  eintraege.unshift({ pfad: "LIESMICH.txt", inhalt: liesMich(daten, anhaenge, jetzt, dateien) });
  for (const a of anhaenge) {
    eintraege.push({ pfad: `dateien/${a.ordner}/${a.pfad}`, inhalt: a.datei, geaendert: new Date(a.geaendert) });
  }
  return eintraege.map((e) => (e.geaendert ? e : { ...e, geaendert: jetzt }));
}

/** Sicherung nur dieses Einsatzes, wie beim JSON-Export. */
export function einsatzSicherung(db: LagekitDB, einsatzId: string, jetzt: Date = new Date()): Promise<ExportDatei> {
  return exportErstellen(db, { einsatzIds: [einsatzId], jetzt });
}
