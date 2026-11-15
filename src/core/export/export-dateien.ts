import type { LagekitDB } from "@/core/db/db";
import { ordnerDurchsuchen, zugriffPruefen } from "@/core/dateien/ordner";
import { ordnerDesEinsatzes } from "@/core/dateien/repository";
import { tagebuchCsv } from "@/tools/einsatztagebuch/export";
import { suchverlaufCsv } from "@/tools/recherche/export";
import { dosisCsv } from "@/tools/strahlenexposition/export";
import { berichtHtml } from "./bericht";
import { einsatzSicherung, paketDateiname, paketInhalt, type AnhangDatei, type EinsatzDaten } from "./einsatz-paket";
import { zipErstellen } from "./zip";

/** Was sich einzeln herunterladen, mailen oder teilen lässt. */
export type ExportArt = "pdf" | "zip" | "bericht" | "sicherung" | "tagebuch" | "strahlen" | "suchverlauf";

export const EXPORT_ARTEN: { art: ExportArt; titel: string; kurz: string }[] = [
  { art: "pdf", titel: "Einsatzbericht (PDF)", kurz: "Bericht (PDF)" },
  { art: "zip", titel: "Alles als ZIP", kurz: "ZIP" },
  { art: "bericht", titel: "Einsatzbericht (HTML, druckbar)", kurz: "Bericht (HTML)" },
  { art: "tagebuch", titel: "Einsatztagebuch (CSV)", kurz: "Tagebuch (CSV)" },
  { art: "strahlen", titel: "Strahlenexposition (CSV)", kurz: "Strahlen (CSV)" },
  { art: "suchverlauf", titel: "Suchverlauf (CSV)", kurz: "Suchverlauf (CSV)" },
  { art: "sicherung", titel: "Lagekit-Sicherung (JSON)", kurz: "Sicherung (JSON)" },
];

/** Gibt es für diese Art überhaupt Inhalt? */
export function exportArtVorhanden(art: ExportArt, daten: EinsatzDaten): boolean {
  if (art === "tagebuch") return daten.eintraege.length > 0;
  if (art === "strahlen") return daten.aufenthalte.length > 0;
  if (art === "suchverlauf") return daten.suchen.length > 0;
  return true;
}

export interface AnhangSammlung {
  anhaenge: AnhangDatei[];
  /** Ordner, die gerade nicht gelesen werden konnten (kein Zugriff, getrennt). */
  fehlend: string[];
  abgeschnitten: string[];
}

/** Liest die Dateien der verknüpften Ordner frisch ein und hängt die einmalig gewählten an. */
export async function anhaengeSammeln(
  db: LagekitDB,
  einsatzId: string,
  optionen: { ordner: boolean; zusaetzlich: File[] },
): Promise<AnhangSammlung> {
  const ergebnis: AnhangSammlung = { anhaenge: [], fehlend: [], abgeschnitten: [] };
  if (optionen.ordner) {
    for (const ordner of await ordnerDesEinsatzes(db, einsatzId)) {
      try {
        if ((await zugriffPruefen(ordner.handle)) !== "erlaubt") {
          ergebnis.fehlend.push(ordner.name);
          continue;
        }
        const { dateien, abgeschnitten } = await ordnerDurchsuchen(ordner.handle);
        if (abgeschnitten) ergebnis.abgeschnitten.push(ordner.name);
        for (const d of dateien) {
          ergebnis.anhaenge.push({ ordner: ordner.name, pfad: d.pfad, datei: d.datei, groesse: d.groesse, geaendert: d.geaendert });
        }
      } catch {
        ergebnis.fehlend.push(ordner.name);
      }
    }
  }
  for (const datei of optionen.zusaetzlich) {
    const pfad = (datei as File & { webkitRelativePath?: string }).webkitRelativePath || datei.name;
    ergebnis.anhaenge.push({ ordner: "Anhänge", pfad, datei, groesse: datei.size, geaendert: datei.lastModified });
  }
  return ergebnis;
}

/** Erstellt die gewünschte Datei. Für das ZIP vorher `anhaengeSammeln`. */
export async function exportDateiErstellen(
  db: LagekitDB,
  art: ExportArt,
  daten: EinsatzDaten,
  optionen: { anhaenge?: AnhangDatei[]; fortschritt?: (anteil: number) => void; jetzt?: Date } = {},
): Promise<File> {
  const { anhaenge = [], fortschritt, jetzt = new Date() } = optionen;
  const name = (endung: string, zusatz = "") =>
    paketDateiname(daten.einsatz, jetzt, endung).replace(/\.[a-z]+$/, `${zusatz}.${endung}`);
  const text = (inhalt: string, dateiname: string, typ: string) => new File([inhalt], dateiname, { type: typ, lastModified: jetzt.getTime() });

  // pdf-lib erst bei Bedarf laden: hält den Start der App schlank.
  const pdf = async () => (await import("./bericht-pdf")).berichtPdf(daten, { anhaenge, jetzt });

  switch (art) {
    case "pdf":
      return new File([(await pdf()) as Uint8Array<ArrayBuffer>], name("pdf", "-bericht"), { type: "application/pdf", lastModified: jetzt.getTime() });
    case "zip": {
      const sicherung = await einsatzSicherung(db, daten.einsatz.id, jetzt);
      const inhalt = paketInhalt(daten, sicherung, anhaenge, jetzt, new Blob([(await pdf()) as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      const blob = await zipErstellen(inhalt, { fortschritt, jetzt });
      return new File([blob], name("zip"), { type: "application/zip", lastModified: jetzt.getTime() });
    }
    case "bericht":
      return text(berichtHtml(daten, { anhaenge, jetzt }), name("html", "-bericht"), "text/html");
    case "sicherung":
      return text(JSON.stringify(await einsatzSicherung(db, daten.einsatz.id, jetzt), null, 2), name("json"), "application/json");
    case "tagebuch":
      return text(tagebuchCsv(daten.eintraege), name("csv", "-tagebuch"), "text/csv");
    case "strahlen":
      return text(dosisCsv(daten.personen, daten.aufenthalte, daten.richtwerte, jetzt), name("csv", "-dosis"), "text/csv");
    case "suchverlauf":
      return text(suchverlaufCsv(daten.suchen), name("csv", "-suchverlauf"), "text/csv");
  }
}
