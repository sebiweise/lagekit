# Export, Druck und Mail

Alles zu einem Einsatz verlässt das Gerät über die Seite **Export, Druck, Mail** (`/export/`, mit `?einsatz=<id>` auch für nicht aktive Einsätze). Es gibt keinen Server-Versand: Lagekit erzeugt Dateien im Browser und übergibt sie dem Gerät.

## ZIP

`src/core/export/zip.ts` schreibt ein ZIP ohne Bibliothek, unkomprimiert („stored“). Fotos und Videos sind ohnehin komprimiert; so bleibt der Export schnell, und Original-Dateien werden nicht in den Speicher kopiert (nur die CRC-32 liest jede Datei einmal). Grenzen: unter 4 GB je Datei und insgesamt, höchstens 65 535 Dateien.

Inhalt (`paketInhalt` in `einsatz-paket.ts`):

| Datei | Inhalt |
| --- | --- |
| `LIESMICH.txt` | Was im Archiv steckt |
| `einsatzbericht.html` | Bericht, öffnet in jedem Browser, druckbar |
| `sicherung.json` | Lagekit-Sicherung des Einsatzes, wieder importierbar |
| `einsatztagebuch.csv`, `strahlenexposition.csv`, `suchverlauf.csv` | nur wenn es Daten gibt |
| `dateien/<Ordner>/…` | verknüpfte Ordner und einmalig hinzugefügte Dateien (`dateien/Anhänge/`) |

## Einsatzbericht

`bericht.ts` erzeugt den Bericht als HTML-Text mit eigenem CSS. Dieselbe Fassung zeigt die Druckansicht `/export/bericht/` und liegt im ZIP. Jede Ausgabe aus Daten läuft durch `esc()`. PDF entsteht über „Als PDF speichern“ im Druckdialog.

## Mail

`mail.ts`, zwei Wege:

- **Im Mailprogramm öffnen** (überall): `mailto:` mit Empfänger, Betreff und Kurzbericht. Ein mailto-Link kann keine Datei anhängen; die gewählte Datei wird vorher gespeichert und muss angehängt werden. Der Link bleibt unter 1900 Zeichen (Grenze unter Windows), längere Texte werden zeilenweise gekürzt.
- **Mit Anhang teilen** (nur wenn `navigator.canShare({ files })`, also iPhone/iPad, Android, Chrome/Edge unter Windows): Web Share API übergibt die Datei direkt an Mail oder Outlook. Empfänger lassen sich dabei nicht vorgeben.

Der zuletzt eingegebene Empfänger bleibt je Gerät in `localStorage` (`lagekit.mail.empfaenger`).

## Verknüpfte Ordner

`src/core/dateien/`. Grundlage ist `showDirectoryPicker` (File System Access API), nur Chrome und Edge am PC. Andere Browser zeigen einen Hinweis und bieten nur „Dateien hinzufügen“ für den einzelnen Export (geht überall, auch auf dem iPhone).

- Der Ordner-Handle liegt in der Tabelle `ordner` (Datenbank-Version 6) und gehört zum Gerät: nicht in der Sicherung, nicht in der Sitzung „Gemeinsam“.
- `OrdnerHinweis` im Layout prüft die Ordner des aktiven Einsatzes alle 15 Sekunden, solange die App sichtbar ist, und beim Zurückkehren in die App. Neue oder geänderte Dateien landen in `neu` und erscheinen als Leiste auf allen Seiten, bis sie als gesehen markiert sind. Die erste Prüfung nach dem Verknüpfen meldet nichts als neu.
- Nach einem Browser-Neustart fragt Chrome je nach Einstellung erneut nach der Erlaubnis. Die Leiste zeigt dann „wieder überwachen“; die Erlaubnis gibt es nur aus einem Klick heraus.
- Grenzen je Ordner: 5000 Dateien, 6 Ebenen Unterordner. Systemdateien (`.DS_Store`, `Thumbs.db`, versteckte Dateien) werden übersprungen.

## Dateibrowser und Verweise

- Tool **Dateien** (`/tools/dateien/`, auch im Arbeitsbereich): verknüpfte Ordner des aktiven Einsatzes mit Unterordnern, Suche über alle Ordner und Sortierung. Grundlage ist die gespeicherte Dateiliste der letzten Prüfung; gelesen wird eine Datei erst beim Öffnen.
- **Vorschau** (`DateiVorschau` im Layout, aufgerufen mit `dateiZeigen`): Bilder, Videos, Ton, PDF und Text (erste 200 KB), sonst „Neuer Tab“ oder „Speichern“. Pfeiltasten blättern durch die Dateien der Ansicht.
- **Verweise** im Einsatztagebuch: `[[Ordner/Pfad]]` als reiner Text, damit Druck, CSV und Sicherung lesbar bleiben. In der Liste erscheint er als antippbarer Link. „/“ am Wortanfang im Textfeld (oder die Büroklammer) öffnet die Auswahl; „1/2“ oder „A/B“ lösen nichts aus. Auf einem Gerät ohne den Ordner meldet die Vorschau, dass der Ordner hier nicht verknüpft ist.
