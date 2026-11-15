import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { groesseText } from "@/core/dateien/ordner";
import { APP_VERSION } from "@/core/version";
import { formatDatumZeit, formatDauer, formatZeit } from "@/lib/zeit";
import { chronologisch, korrekturen } from "@/tools/einsatztagebuch/logic";
import { aufenthaltDosis, formatDosis, formatOdl } from "@/tools/strahlenexposition/logic";
import { AMPEL_TEXT, dosisUebersicht, ortText, zeitraumText, type AnhangDatei, type EinsatzDaten } from "./einsatz-paket";

/**
 * Einsatzbericht als echtes PDF, im Browser erzeugt (pdf-lib, ohne Server und
 * ohne Netz). Inhalt wie `berichtHtml`; gedacht als Mail-Anhang, wo ein
 * HTML-Anhang beim Empfänger oft blockiert wird.
 *
 * Schrift ist Helvetica aus den PDF-Standardschriften: kein Einbetten nötig,
 * Umlaute gehen (WinAnsi). Zeichen außerhalb davon werden ersetzt.
 */

const A4 = { breite: 595.28, hoehe: 841.89 };
const RAND = 42;
const FUSS = 28;
const SCHWARZ = rgb(0.07, 0.07, 0.07);
const GRAU = rgb(0.35, 0.35, 0.35);
const LINIE = rgb(0.8, 0.8, 0.8);
const ROT = rgb(0.725, 0.11, 0.11);
const GELB_HINTERGRUND = rgb(0.996, 0.953, 0.78);
const ROT_HINTERGRUND = rgb(0.996, 0.886, 0.886);

/** Zeichen, die WinAnsi zusätzlich zu Latin-1 kennt. */
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const ERSATZ: Record<string, string> = { "→": "->", "←": "<-", "Ḣ": "H", "≈": "~", "≤": "<=", "≥": ">=", "×": "x", "\t": " " };

/** Macht einen Text für die Standardschrift druckbar. */
export function pdfText(text: string): string {
  let ergebnis = "";
  for (const z of text.normalize("NFC")) {
    const c = z.codePointAt(0)!;
    if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff && c !== 0xad) || WIN_ANSI_EXTRA.has(z)) ergebnis += z;
    else if (ERSATZ[z] !== undefined) ergebnis += ERSATZ[z];
    else if (z === "\n" || z === "\r") ergebnis += " ";
    else ergebnis += "?";
  }
  return ergebnis;
}

interface Spalte {
  titel: string;
  /** Anteil an der Tabellenbreite. */
  anteil: number;
}

interface Zelle {
  text: string;
  durchgestrichen?: boolean;
  klein?: string;
}

class Satz {
  private seite!: PDFPage;
  private y = 0;
  readonly seiten: PDFPage[] = [];
  readonly breite = A4.breite - 2 * RAND;

  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private fett: PDFFont,
  ) {
    this.neueSeite();
  }

  neueSeite() {
    this.seite = this.doc.addPage([A4.breite, A4.hoehe]);
    this.seiten.push(this.seite);
    this.y = A4.hoehe - RAND;
  }

  /** Platz sichern; sonst neue Seite. Rückgabe: ob umgebrochen wurde. */
  platz(hoehe: number): boolean {
    if (this.y - hoehe < RAND + FUSS) {
      this.neueSeite();
      return true;
    }
    return false;
  }

  abstand(h: number) {
    this.y -= h;
  }

  /** Bricht Text auf eine Breite um; zu lange Wörter werden zeichenweise geteilt. */
  umbrechen(text: string, font: PDFFont, groesse: number, breite: number): string[] {
    const zeilen: string[] = [];
    let zeile = "";
    const passt = (t: string) => font.widthOfTextAtSize(t, groesse) <= breite;
    for (const wort of pdfText(text).split(/ +/)) {
      const versuch = zeile ? `${zeile} ${wort}` : wort;
      if (passt(versuch)) {
        zeile = versuch;
        continue;
      }
      if (zeile) zeilen.push(zeile);
      zeile = "";
      let rest = wort;
      while (!passt(rest)) {
        let n = rest.length - 1;
        while (n > 1 && !passt(rest.slice(0, n))) n--;
        zeilen.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      zeile = rest;
    }
    zeilen.push(zeile);
    return zeilen;
  }

  text(text: string, optionen: { groesse?: number; fett?: boolean; farbe?: RGB; x?: number; breite?: number } = {}) {
    const { groesse = 10, fett = false, farbe = SCHWARZ, x = RAND, breite = this.breite } = optionen;
    const font = fett ? this.fett : this.normal;
    for (const zeile of this.umbrechen(text, font, groesse, breite)) {
      this.platz(groesse * 1.35);
      this.y -= groesse * 1.35;
      this.seite.drawText(zeile, { x, y: this.y + groesse * 0.3, size: groesse, font, color: farbe });
    }
  }

  linie(dicke = 1, farbe: RGB = SCHWARZ) {
    this.seite.drawLine({ start: { x: RAND, y: this.y }, end: { x: RAND + this.breite, y: this.y }, thickness: dicke, color: farbe });
  }

  ueberschrift(titel: string) {
    this.platz(60);
    this.abstand(14);
    this.text(titel, { groesse: 13, fett: true });
    this.abstand(3);
    this.linie(1.2);
    this.abstand(4);
  }

  zwischentitel(titel: string) {
    this.platz(40);
    this.abstand(6);
    this.text(titel, { groesse: 11, fett: true });
    this.abstand(2);
  }

  angaben(paare: [string, string][]) {
    const links = 80;
    for (const [titel, wert] of paare) {
      const zeilen = this.umbrechen(wert, this.normal, 10, this.breite - links);
      this.platz(zeilen.length * 13.5);
      const start = this.y;
      this.seite.drawText(pdfText(titel), { x: RAND, y: start - 13.5 + 3, size: 10, font: this.normal, color: GRAU });
      this.text(wert, { x: RAND + links, breite: this.breite - links });
    }
  }

  tabelle(spalten: Spalte[], zeilen: { zellen: Zelle[]; hintergrund?: RGB }[]) {
    const summe = spalten.reduce((s, sp) => s + sp.anteil, 0);
    const breiten = spalten.map((s) => (s.anteil / summe) * this.breite);
    const xs = breiten.map((_, i) => RAND + breiten.slice(0, i).reduce((s, b) => s + b, 0));
    const groesse = 8.5;
    const zeilenhoehe = groesse * 1.3;
    const innen = 3;

    const kopf = () => {
      this.platz(zeilenhoehe * 3);
      const hoehe = zeilenhoehe + 4;
      spalten.forEach((s, i) =>
        this.seite.drawText(pdfText(s.titel), { x: xs[i], y: this.y - zeilenhoehe + 2, size: groesse, font: this.fett, color: SCHWARZ }),
      );
      this.y -= hoehe;
      this.linie(0.8);
    };
    kopf();

    for (const zeile of zeilen) {
      const umbrochen = zeile.zellen.map((z, i) => ({
        zeilen: this.umbrechen(z.text, this.normal, groesse, breiten[i] - innen * 2),
        klein: z.klein ? this.umbrechen(z.klein, this.normal, groesse - 1.5, breiten[i] - innen * 2) : [],
        durch: z.durchgestrichen,
      }));
      const hoehe = Math.max(...umbrochen.map((u) => u.zeilen.length * zeilenhoehe + u.klein.length * (zeilenhoehe - 2))) + 5;
      if (this.platz(hoehe)) kopf();
      if (zeile.hintergrund) {
        this.seite.drawRectangle({ x: RAND, y: this.y - hoehe, width: this.breite, height: hoehe, color: zeile.hintergrund });
      }
      umbrochen.forEach((u, i) => {
        let y = this.y - 2;
        for (const t of u.zeilen) {
          y -= zeilenhoehe;
          this.seite.drawText(t, { x: xs[i], y: y + 3, size: groesse, font: this.normal, color: SCHWARZ });
          if (u.durch && t) {
            const w = this.normal.widthOfTextAtSize(t, groesse);
            this.seite.drawLine({ start: { x: xs[i], y: y + 5.8 }, end: { x: xs[i] + w, y: y + 5.8 }, thickness: 0.6, color: SCHWARZ });
          }
        }
        for (const t of u.klein) {
          y -= zeilenhoehe - 2;
          this.seite.drawText(t, { x: xs[i], y: y + 3, size: groesse - 1.5, font: this.normal, color: GRAU });
        }
      });
      this.y -= hoehe;
      this.linie(0.4, LINIE);
    }
  }

  fusszeilen(links: string) {
    const font = this.normal;
    this.seiten.forEach((seite, i) => {
      const rechts = `Seite ${i + 1} von ${this.seiten.length}`;
      seite.drawText(pdfText(links), { x: RAND, y: RAND - 14, size: 7.5, font, color: GRAU });
      seite.drawText(rechts, { x: A4.breite - RAND - font.widthOfTextAtSize(rechts, 7.5), y: RAND - 14, size: 7.5, font, color: GRAU });
    });
  }

  roterStrich() {
    this.seite.drawLine({ start: { x: RAND, y: this.y }, end: { x: RAND + this.breite, y: this.y }, thickness: 2.5, color: ROT });
  }

  unterschriften(links: string, rechts: string) {
    this.platz(70);
    this.abstand(50);
    const halb = (this.breite - 30) / 2;
    for (const [x, t] of [
      [RAND, links],
      [RAND + halb + 30, rechts],
    ] as const) {
      this.seite.drawLine({ start: { x, y: this.y }, end: { x: x + halb, y: this.y }, thickness: 0.8, color: SCHWARZ });
      this.seite.drawText(pdfText(t), { x, y: this.y - 11, size: 8, font: this.normal, color: SCHWARZ });
    }
    this.abstand(14);
  }
}

export async function berichtPdf(
  daten: EinsatzDaten,
  optionen: { anhaenge?: AnhangDatei[]; jetzt?: Date } = {},
): Promise<Uint8Array> {
  const { anhaenge = [], jetzt = new Date() } = optionen;
  const { einsatz } = daten;
  const doc = await PDFDocument.create();
  doc.setTitle(pdfText(`Einsatzbericht ${einsatz.stichwort}`));
  doc.setCreator(`Lagekit ${APP_VERSION}`);
  doc.setProducer("Lagekit");
  doc.setLanguage("de-DE");
  doc.setCreationDate(jetzt);
  doc.setModificationDate(jetzt);
  const s = new Satz(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  s.text(`Einsatzbericht: ${einsatz.stichwort}`, { groesse: 17, fett: true });
  s.text(`Stand ${formatDatumZeit(jetzt)} · Lagekit ${APP_VERSION}`, { groesse: 8.5, farbe: GRAU });
  s.abstand(5);
  s.roterStrich();
  s.abstand(6);
  s.angaben(
    (
      [
        ["Stichwort", einsatz.stichwort],
        ["Ort", ortText(einsatz)],
        ["Einheit", einsatz.einheit],
        ["Zeitraum", zeitraumText(einsatz)],
        ["Status", einsatz.status === "aktiv" ? "laufend" : "abgeschlossen"],
      ] as [string, string][]
    ).filter(([, w]) => w),
  );

  // Einsatztagebuch
  s.ueberschrift(`Einsatztagebuch (${daten.eintraege.length})`);
  if (daten.eintraege.length === 0) {
    s.text("Keine Einträge.", { farbe: GRAU });
  } else {
    const nachId = new Map(daten.eintraege.map((e) => [e.id, e]));
    const ersetzt = korrekturen(daten.eintraege);
    s.tabelle(
      [
        { titel: "Nr.", anteil: 4 },
        { titel: "Zeit", anteil: 6 },
        { titel: "Art", anteil: 10 },
        { titel: "Von -> An", anteil: 18 },
        { titel: "Inhalt", anteil: 48 },
        { titel: "Verfasser", anteil: 14 },
      ],
      chronologisch(daten.eintraege).map((e) => {
        const durch = ersetzt.get(e.id);
        const korrigiert = e.korrigiertEintragId ? nachId.get(e.korrigiertEintragId) : undefined;
        const hinweise = [korrigiert && `(korrigiert Nr. ${korrigiert.nr})`, durch && `(korrigiert durch Nr. ${durch.nr})`].filter(Boolean);
        return {
          zellen: [
            { text: String(e.nr) },
            { text: formatZeit(e.zeitpunkt) },
            { text: e.art },
            { text: e.von || e.an ? `${e.von || "?"} -> ${e.an || "?"}` : "" },
            { text: e.inhalt, durchgestrichen: Boolean(durch), klein: hinweise.join(" ") || undefined },
            { text: e.verfasser },
          ],
        };
      }),
    );
  }

  // Strahlenexposition
  if (daten.personen.length > 0) {
    s.ueberschrift(`Strahlenexposition (${daten.personen.length} Personen)`);
    s.zwischentitel("Personen");
    s.tabelle(
      [
        { titel: "Name", anteil: 20 },
        { titel: "Trupp", anteil: 15 },
        { titel: "Dosis berechnet", anteil: 14 },
        { titel: "Dosimeter", anteil: 12 },
        { titel: "Richtwert", anteil: 17 },
        { titel: "Bewertung", anteil: 22 },
      ],
      dosisUebersicht(daten, jetzt).map((d) => ({
        hintergrund: d.ampel === "rot" ? ROT_HINTERGRUND : d.ampel === "gelb" ? GELB_HINTERGRUND : undefined,
        zellen: [
          { text: d.person.name },
          { text: d.person.trupp },
          { text: formatDosis(d.dosisMsv) },
          { text: d.dosimeterMsv === null ? "–" : formatDosis(d.dosimeterMsv) },
          { text: `${d.richtwert.bezeichnung}: ${d.richtwert.grenzeMsv} mSv` },
          { text: AMPEL_TEXT[d.ampel] },
        ],
      })),
    );
    if (daten.aufenthalte.length > 0) {
      const name = new Map(daten.personen.map((p) => [p.id, p.name]));
      s.zwischentitel("Aufenthalte");
      s.tabelle(
        [
          { titel: "Person", anteil: 16 },
          { titel: "Ort", anteil: 16 },
          { titel: "Beginn", anteil: 16 },
          { titel: "Ende", anteil: 10 },
          { titel: "Dauer", anteil: 9 },
          { titel: "ODL", anteil: 11 },
          { titel: "Dosis", anteil: 11 },
          { titel: "Dosimeter", anteil: 11 },
        ],
        [...daten.aufenthalte]
          .sort((a, b) => a.beginn.localeCompare(b.beginn))
          .map((a) => {
            const b = aufenthaltDosis(a, jetzt);
            return {
              zellen: [
                { text: name.get(a.personId) ?? "?" },
                { text: a.ort },
                { text: formatDatumZeit(a.beginn) },
                { text: a.ende ? formatZeit(a.ende) : `läuft (Stand ${formatZeit(jetzt)})` },
                { text: formatDauer(b.dauerH * 60) },
                { text: formatOdl(a.odl, a.odlEinheit) },
                { text: formatDosis(b.dosisMsv) },
                { text: a.dosimeterMsv === null ? "–" : formatDosis(a.dosimeterMsv) },
              ],
            };
          }),
      );
    }
    s.abstand(4);
    s.text("Berechnung D = H x t je Aufenthalt bei gleichbleibender Ortsdosisleistung.", { groesse: 7.5, farbe: GRAU });
  }

  if (daten.suchen.length > 0) {
    s.ueberschrift(`Suchverlauf externe Tools (${daten.suchen.length})`);
    s.tabelle(
      [
        { titel: "Zeit", anteil: 18 },
        { titel: "Tool", anteil: 22 },
        { titel: "Begriff", anteil: 35 },
        { titel: "Ort", anteil: 25 },
      ],
      daten.suchen.map((x) => ({ zellen: [{ text: formatDatumZeit(x.zeitpunkt) }, { text: x.toolName }, { text: x.begriff }, { text: x.ort }] })),
    );
  }

  if (anhaenge.length > 0) {
    s.ueberschrift(`Dateien (${anhaenge.length})`);
    s.tabelle(
      [
        { titel: "Ordner", anteil: 15 },
        { titel: "Datei", anteil: 50 },
        { titel: "Größe", anteil: 12 },
        { titel: "Geändert", anteil: 23 },
      ],
      anhaenge.map((a) => ({
        zellen: [{ text: a.ordner }, { text: a.pfad }, { text: groesseText(a.groesse) }, { text: formatDatumZeit(new Date(a.geaendert)) }],
      })),
    );
  }

  s.unterschriften("Datum, Unterschrift Einsatzleitung", "Datum, Unterschrift Führungsassistenz");
  s.fusszeilen(`Einsatzbericht ${einsatz.stichwort} · Stand ${formatDatumZeit(jetzt)}`);
  return doc.save();
}
