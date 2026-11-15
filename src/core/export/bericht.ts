import { APP_VERSION } from "@/core/version";
import { formatDatumZeit, formatDauer, formatZeit } from "@/lib/zeit";
import { chronologisch, korrekturen } from "@/tools/einsatztagebuch/logic";
import { aufenthaltDosis, formatDosis, formatOdl } from "@/tools/strahlenexposition/logic";
import { groesseText } from "@/core/dateien/ordner";
import { AMPEL_TEXT, dosisUebersicht, ortText, zeitraumText, type AnhangDatei, type EinsatzDaten } from "./einsatz-paket";

/**
 * Einsatzbericht als eigenständiges HTML: dieselbe Fassung erscheint in der
 * Druckansicht der App und als `einsatzbericht.html` im ZIP. Kein Skript, keine
 * externen Dateien, damit er überall offline öffnet und druckt.
 */

/** Maskiert Text für HTML. Jede Ausgabe aus Daten läuft hier durch. */
export function esc(wert: unknown): string {
  return String(wert ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const BERICHT_CSS = `
.lk-bericht { color: #111; background: #fff; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.lk-bericht h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.lk-bericht h2 { font-size: 18px; font-weight: 700; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #111; break-after: avoid; }
.lk-bericht h3 { font-size: 15px; font-weight: 600; margin: 16px 0 6px; break-after: avoid; }
.lk-bericht .lk-kopf { border-bottom: 3px solid #b91c1c; padding-bottom: 10px; margin-bottom: 8px; }
.lk-bericht .lk-meta { color: #555; font-size: 12px; }
.lk-bericht dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 20px; margin: 8px 0; }
.lk-bericht dt { color: #555; }
.lk-bericht dd { margin: 0; }
.lk-bericht table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lk-bericht th, .lk-bericht td { text-align: left; vertical-align: top; padding: 3px 8px 3px 0; border-bottom: 1px solid #ccc; }
.lk-bericht th { font-weight: 600; border-bottom: 1px solid #111; }
.lk-bericht tr { break-inside: avoid; }
.lk-bericht .lk-zahl { font-variant-numeric: tabular-nums; white-space: nowrap; }
.lk-bericht .lk-klein { font-size: 11px; color: #555; }
.lk-bericht .lk-durch { text-decoration: line-through; }
.lk-bericht .lk-leer { color: #555; font-style: italic; }
.lk-bericht .lk-ampel-gelb { background: #fef3c7; }
.lk-bericht .lk-ampel-rot { background: #fee2e2; font-weight: 600; }
.lk-bericht .lk-unterschrift { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; font-size: 12px; }
.lk-bericht .lk-unterschrift div { border-top: 1px solid #111; padding-top: 4px; }
@media print { .lk-bericht h2 { break-before: auto; } }
`;

export interface BerichtOptionen {
  anhaenge?: AnhangDatei[];
  jetzt?: Date;
}

function abschnitt(titel: string, inhalt: string): string {
  return `<section><h2>${esc(titel)}</h2>${inhalt}</section>`;
}

function tagebuch(daten: EinsatzDaten): string {
  if (daten.eintraege.length === 0) return `<p class="lk-leer">Keine Einträge.</p>`;
  const nachId = new Map(daten.eintraege.map((e) => [e.id, e]));
  const ersetzt = korrekturen(daten.eintraege);
  const zeilen = chronologisch(daten.eintraege)
    .map((e) => {
      const durch = ersetzt.get(e.id);
      const korrigiert = e.korrigiertEintragId ? nachId.get(e.korrigiertEintragId) : undefined;
      const weg = e.von || e.an ? `${esc(e.von || "?")} → ${esc(e.an || "?")}` : "";
      return `<tr>
<td class="lk-zahl">${e.nr}</td>
<td class="lk-zahl">${esc(formatZeit(e.zeitpunkt))}</td>
<td>${esc(e.art)}</td>
<td>${weg}</td>
<td><span${durch ? ' class="lk-durch"' : ""}>${esc(e.inhalt)}</span>${korrigiert ? `<div class="lk-klein">(korrigiert Nr. ${korrigiert.nr})</div>` : ""}${durch ? `<div class="lk-klein">(korrigiert durch Nr. ${durch.nr})</div>` : ""}</td>
<td>${esc(e.verfasser)}</td>
</tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Nr.</th><th>Zeit</th><th>Art</th><th>Von → An</th><th>Inhalt</th><th>Verfasser</th></tr></thead><tbody>${zeilen}</tbody></table>`;
}

function strahlen(daten: EinsatzDaten, jetzt: Date): string {
  const uebersicht = dosisUebersicht(daten, jetzt);
  const personen = uebersicht
    .map(
      (d) => `<tr class="lk-ampel-${d.ampel}">
<td>${esc(d.person.name)}</td>
<td>${esc(d.person.trupp)}</td>
<td class="lk-zahl">${esc(formatDosis(d.dosisMsv))}</td>
<td class="lk-zahl">${d.dosimeterMsv === null ? "–" : esc(formatDosis(d.dosimeterMsv))}</td>
<td>${esc(d.richtwert.bezeichnung)}: ${esc(d.richtwert.grenzeMsv)} mSv</td>
<td>${esc(AMPEL_TEXT[d.ampel])}</td>
</tr>`,
    )
    .join("");
  const name = new Map(daten.personen.map((p) => [p.id, p.name]));
  const aufenthalte = [...daten.aufenthalte]
    .sort((a, b) => a.beginn.localeCompare(b.beginn))
    .map((a) => {
      const b = aufenthaltDosis(a, jetzt);
      return `<tr>
<td>${esc(name.get(a.personId) ?? "?")}</td>
<td>${esc(a.ort)}</td>
<td class="lk-zahl">${esc(formatDatumZeit(a.beginn))}</td>
<td class="lk-zahl">${a.ende ? esc(formatZeit(a.ende)) : `läuft (Stand ${esc(formatZeit(jetzt))})`}</td>
<td class="lk-zahl">${esc(formatDauer(b.dauerH * 60))}</td>
<td class="lk-zahl">${esc(formatOdl(a.odl, a.odlEinheit))}</td>
<td class="lk-zahl">${esc(formatDosis(b.dosisMsv))}</td>
<td class="lk-zahl">${a.dosimeterMsv === null ? "–" : esc(formatDosis(a.dosimeterMsv))}</td>
</tr>`;
    })
    .join("");
  return `<h3>Personen</h3>
<table><thead><tr><th>Name</th><th>Trupp</th><th>Dosis berechnet</th><th>Dosimeter</th><th>Richtwert</th><th>Bewertung</th></tr></thead><tbody>${personen}</tbody></table>
<h3>Aufenthalte</h3>
${aufenthalte ? `<table><thead><tr><th>Person</th><th>Ort</th><th>Beginn</th><th>Ende</th><th>Dauer</th><th>ODL</th><th>Dosis</th><th>Dosimeter</th></tr></thead><tbody>${aufenthalte}</tbody></table>` : `<p class="lk-leer">Keine Aufenthalte.</p>`}
<p class="lk-klein">Berechnung D = Ḣ × t je Aufenthalt bei gleichbleibender Ortsdosisleistung. Einzelnachweise je Person: Strahlenexposition &gt; Dosisnachweis.</p>`;
}

function suchverlauf(daten: EinsatzDaten): string {
  const zeilen = daten.suchen
    .map(
      (s) =>
        `<tr><td class="lk-zahl">${esc(formatDatumZeit(s.zeitpunkt))}</td><td>${esc(s.toolName)}</td><td>${esc(s.begriff)}</td><td>${esc(s.ort)}</td></tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Zeit</th><th>Tool</th><th>Begriff</th><th>Ort</th></tr></thead><tbody>${zeilen}</tbody></table>`;
}

function anhaenge(liste: AnhangDatei[]): string {
  const zeilen = liste
    .map(
      (a) =>
        `<tr><td>${esc(a.ordner)}</td><td>${esc(a.pfad)}</td><td class="lk-zahl">${esc(groesseText(a.groesse))}</td><td class="lk-zahl">${esc(formatDatumZeit(new Date(a.geaendert)))}</td></tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Ordner</th><th>Datei</th><th>Größe</th><th>Geändert</th></tr></thead><tbody>${zeilen}</tbody></table>
<p class="lk-klein">Die Dateien liegen im ZIP-Export unter <code>dateien/</code>.</p>`;
}

/** Inhalt des Berichts (ohne `<html>`), für die Druckansicht in der App. */
export function berichtInhalt(daten: EinsatzDaten, optionen: BerichtOptionen = {}): string {
  const { anhaenge: liste = [], jetzt = new Date() } = optionen;
  const { einsatz } = daten;
  const angaben: [string, string][] = [
    ["Stichwort", einsatz.stichwort],
    ["Ort", ortText(einsatz)],
    ["Einheit", einsatz.einheit],
    ["Zeitraum", zeitraumText(einsatz)],
    ["Status", einsatz.status === "aktiv" ? "laufend" : "abgeschlossen"],
  ];
  const teile = [
    `<header class="lk-kopf"><h1>Einsatzbericht: ${esc(einsatz.stichwort)}</h1>
<p class="lk-meta">Stand ${esc(formatDatumZeit(jetzt))} · Lagekit ${esc(APP_VERSION)}</p></header>`,
    `<dl>${angaben
      .filter(([, wert]) => wert)
      .map(([titel, wert]) => `<dt>${esc(titel)}</dt><dd>${esc(wert)}</dd>`)
      .join("")}</dl>`,
    abschnitt(`Einsatztagebuch (${daten.eintraege.length})`, tagebuch(daten)),
  ];
  if (daten.personen.length > 0) teile.push(abschnitt(`Strahlenexposition (${daten.personen.length} Personen)`, strahlen(daten, jetzt)));
  if (daten.suchen.length > 0) teile.push(abschnitt(`Suchverlauf externe Tools (${daten.suchen.length})`, suchverlauf(daten)));
  if (liste.length > 0) teile.push(abschnitt(`Dateien (${liste.length})`, anhaenge(liste)));
  teile.push(`<div class="lk-unterschrift"><div>Datum, Unterschrift Einsatzleitung</div><div>Datum, Unterschrift Führungsassistenz</div></div>`);
  return `<article class="lk-bericht">${teile.join("\n")}</article>`;
}

/** Vollständiges HTML-Dokument für das ZIP. */
export function berichtHtml(daten: EinsatzDaten, optionen: BerichtOptionen = {}): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Einsatzbericht ${esc(daten.einsatz.stichwort)}</title>
<style>
body { margin: 0; background: #fff; }
main { max-width: 1000px; margin: 0 auto; padding: 24px; }
@page { size: A4; margin: 15mm; }
@media print { main { padding: 0; max-width: none; } }
${BERICHT_CSS}
</style>
</head>
<body><main>${berichtInhalt(daten, optionen)}</main></body>
</html>
`;
}
