# Änderungen

Alle wichtigen Änderungen an Lagekit stehen hier. Die App zeigt diese Liste vor jedem Update an.

Regeln für diese Datei:

- Jeder Pull Request trägt seine Änderung unter **Unveröffentlicht** ein, in Worten für Einsatzkräfte.
- Gruppen: `### Neu`, `### Geändert`, `### Behoben`, `### Entfernt` und `### Daten`.
- Unter `### Daten` steht alles, was beim Update gespeicherte Daten umbaut oder verwirft, auch Einstellungen im Browser. Umbauten der Datenbank meldet die App zusätzlich von selbst aus `src/core/db/migrations.ts`.
- Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Ein Release legt der Workflow „Release vorbereiten“ an, siehe [CONTRIBUTING.md](CONTRIBUTING.md#releases).

## [Unveröffentlicht]

### Neu

- Lagekit lässt sich auch in einem Unterordner betreiben, z. B. als Projektseite auf GitHub Pages unter `https://sebiweise.github.io/lagekit/`. Anleitung unter Dokumentation → GitHub Pages.
- Zieht eine Installation auf eine neue Adresse um, kann sie einen Hinweis zeigen: Gespeicherte Daten ziehen nicht von selbst mit, deshalb gibt es dort gleich „Alles sichern“ und den Link zur neuen Adresse. Wie die Sicherung an der neuen Adresse eingelesen wird, steht unter Dokumentation → Selbst betreiben → Umzug auf eine neue Adresse.

## [0.10.0] - 2026-11-16

### Neu

- „Sitzung beenden“ steht beim Host jetzt oben neben dem Titel der Sitzung und in der Befehlspalette (Strg+K). Vor dem Beenden fragt die App nach; danach sind alle Geräte getrennt und der Kurzcode gelöscht.

### Geändert

- Der Kurzcode für „Gemeinsam arbeiten“ gilt jetzt nur noch, solange der Host verbunden ist, und erlischt spätestens 30 Minuten danach (bisher starr 12 Stunden). Ist der Host länger offline, bekommt er beim nächsten Verbinden von selbst einen neuen Kurzcode.
- Der Kurzcode-Dienst löscht Beitrittsanfragen und Antworten genau zu ihrer Ablaufzeit und speichert keine Logs mit IP-Adressen mehr.
- Der Kurzcode-Dienst wehrt Missbrauch früher ab: zu viele Aufrufe von einer Adresse lehnt Cloudflare ab, bevor der Dienst arbeitet, und pro Adresse gibt es höchstens 10 neue Kurzcodes in 10 Minuten.

## [0.9.0] - 2026-11-16

### Neu

- Der Kurzcode für „Gemeinsam arbeiten“ läuft jetzt über einen Dienst bei Cloudflare, der im kostenlosen Plan auskommt. Beitrittsanfragen erscheinen beim Host und die Freigabe beim Gerät jetzt sofort statt nach bis zu 2 Sekunden, weil der Dienst Neuigkeiten direkt zurückmeldet, statt sich ständig fragen zu lassen.
- Docker: Mit der neuen Datei `compose.yaml` laufen App, Kurzcode-Dienst und Redis zusammen auf dem eigenen Server. Der Kurzcode braucht dann keinen Dienst aus dem Internet mehr.
- Lagekit lässt sich komplett als Cloudflare Worker betreiben, mit eigenem Kurzcode-Dienst. Anleitung unter Dokumentation → Cloudflare Workers.

### Geändert

- Installationen auf Vercel ohne Upstash nutzen jetzt den Kurzcode-Dienst des Lagekit-Projekts, statt „Kein Kurzcode“ zu melden. Ältere Installationen, die noch die alte Adresse ansprechen, werden dorthin weitergeleitet.

## [0.8.0] - 2026-11-15

### Neu

- Befehlspalette: Strg+K (am Mac ⌘K) oder die Lupe oben in der Kopfzeile öffnet ein Suchfeld über allem. Ein paar Buchstaben tippen, mit ↑↓ wählen, Enter führt aus. So erreicht man jedes Tool und jede Seite, schreibt einen Tagebuch-Eintrag (der Cursor steht gleich in der Eingabezeile), legt einen Einsatz an, bearbeitet oder wechselt ihn, druckt den Einsatzbericht, sichert den Einsatz oder schaltet zwischen hell und dunkel um. Umlaute dürfen fehlen („uebung“ findet „Übung“).
- Ein Suchbegriff wie „UN 1005“ führt aus der Befehlspalette direkt zur Suche in den externen Tools oder öffnet die passende Datenbank sofort.
- Am Handy steht die Befehlspalette oben unter „Mehr“.

### Geändert

- Löschen von Einsätzen, Personen und Aufenthalten fragt in einem eigenen Fenster nach. Der Fokus steht auf „Abbrechen“, damit ein versehentliches Enter nichts löscht.
- Der Papierkorb bei Aufenthalten zeigt am PC beim Darüberfahren, was er tut.

## [0.7.0] - 2026-11-15

### Neu

- Einsatztagebuch: Von und An schlagen beim Tippen bereits genutzte Angaben vor, zuerst die aus dem laufenden Einsatz, dann aus früheren Einsätzen. Die wahrscheinlichste Ergänzung steht grau im Feld, Tab übernimmt sie. Mit ↑↓ lässt sich ein anderer Vorschlag aus der Liste wählen, am Handy einfach antippen. Ohne Vorschlag wechselt Tab wie gewohnt ins nächste Feld.
- Suche: Eine UN-Nummer öffnet jetzt auch in CAMEO Chemicals direkt das Datenblatt mit ERG-Leitfaden und Schutzabständen. Stoffnamen und CAS-Nummern springen in PubChem direkt zum Stoff.
- Neue externe Tools: DWD Waldbrand-Gefahrenindex und Grasland-Feuerindex, Rettungspunkte im Wald (KWF), Amtliche Warnungen des DWD, Naturgefahrenportal, ChemInfo mit Gefahrstoffschnellauskunft, Rigoletto (Wassergefährdungsklassen), EURDEP-Messnetz, ELWIS und OpenFireMap (Hydranten und Feuerwachen).
- Mehr Vorschläge passend zum Einsatz, z. B. bei „Gewitter“, „Starkregen“, „Gewässer“, „Schiff“ oder „Forst“.

### Geändert

- ERI-Cards öffnet direkt die Suchseite statt der alten Startseite.
- Einheitliche Bedienelemente in der ganzen App: „Mehr“ am Handy, die Glocke, die Dateivorschau, die Tool-Auswahl im Arbeitsbereich, Auswahllisten, Tabellen und aufklappbare Bereiche sehen überall gleich aus und lassen sich mit Tastatur und Screenreader gleich bedienen, hell wie dunkel.
- Art im Einsatztagebuch, Filter, Aufteilung im Arbeitsbereich, Hell/Dunkel und „Mit Kurzcode / Offline mit QR-Code“ sind Umschaltleisten; mit den Pfeiltasten wechselt man zwischen den Möglichkeiten.
- „Am Bildschirmrand einblenden“ an der Glocke ist ein Schalter.
- Aufklappbare Bereiche (z. B. „Aufenthalt nachtragen“, „Richtwerte einstellen“) behalten halb ausgefüllte Eingaben beim Zuklappen, und die Suche im Browser (Strg+F) findet auch Text darin.
- Dateien: Der Ordnerpfad oben zeigt den aktuellen Ordner hervorgehoben.

### Behoben

- Link zu den Giftinformationszentren zeigt auf die neue Adresse beim BfR.
- Kopfzeile am Handy (auch als installierte App auf dem iPhone): „Kein Einsatz aktiv“ wurde auf „K…“ gekürzt. Der Knopf zum Anlegen zeigt am Handy nur noch das Plus, die Uhr ist etwas kleiner und Stichwort, Ort und Laufzeit des Einsatzes haben mehr Platz. Am PC bleibt die Kopfzeile wie bisher.

## [0.6.0] - 2026-11-15

### Neu

- Startseite unter der Hauptadresse mit Überblick über alle Funktionen und Links zu GitHub, Releases, Docker-Image und Hilfe.
- Dokumentation unter `/docs/`, auch offline lesbar: Bedienung, fachliche Grundlagen und Anleitungen zum Selbstbetrieb mit Docker, auf einem eigenen Webserver, bei Vercel und bei Cloudflare Pages. In der App erreichbar über „Dokumentation“ in der Seitenleiste und unter „Mehr“.

### Geändert

- Die App liegt jetzt unter `/app/`. Als App installierte Fassungen starten direkt dort, ebenso Geräte, auf denen Lagekit schon genutzt wird, wenn sie die Hauptadresse öffnen. Die Startseite ist in der App über „Über Lagekit“ erreichbar.
- Alte Adressen wie `/einsatz/` oder `/tools/einsatztagebuch/` führen automatisch an die neue Stelle, auch offline. Lesezeichen und Verknüpfungen funktionieren weiter.

### Behoben

- Offline öffneten Adressen mit Zusatz nach einem Fragezeichen (z. B. aus einem Link) die Seite „nicht gefunden“ statt der App.
- „Jetzt aktualisieren“ blieb manchmal bei „Wird aktualisiert …“ stehen. Übernimmt die neue Version nicht innerhalb weniger Sekunden, lädt Lagekit jetzt selbst neu.

### Daten

- Umzug der App nach `/app/`: Einsätze, Tagebuch, Strahlenexposition, verknüpfte Ordner und Einstellungen bleiben unverändert erhalten, weil sie an die Domain gebunden sind, nicht an die Adresse der Seite. Nach dem Update lädt die App an der neuen Adresse neu. Benachrichtigungen im Verlauf verweisen auf die neuen Adressen.

## [0.4.0] - 2026-11-15

### Neu

- Eingaben werden direkt am Feld geprüft, mit verständlichen Hinweisen auf Deutsch statt der Hinweisblasen des Browsers: Einsatz anlegen und bearbeiten, Einsatztagebuch, Personen, Aufenthalte, Dosimeterwerte, Richtwerte, Vorplanung, „Gemeinsam arbeiten“ und Senden per E-Mail.
- Senden per E-Mail: Lagekit meldet Empfänger, die keine gültige E-Mail-Adresse sind, bevor sich das Mailprogramm öffnet.

### Geändert

- Zahlen wie ODL oder Dosimeterwerte: Ungültige Eingaben (z. B. Buchstaben oder negative Werte) bleiben stehen und werden am Feld erklärt; ein ungültiger Dosimeterwert wird nicht mehr still verworfen.
- Ende vor Beginn beim Nachtragen eines Aufenthalts und ein unvollständiger Kurzcode werden sofort am Feld gemeldet.

## [0.3.0] - 2026-11-15

### Neu

- Benachrichtigungen in der App: Neue Tagebucheinträge von anderen Geräten der gemeinsamen Sitzung, neue Dateien in verknüpften Ordnern, Geräte, die sich verbinden oder trennen, und eine neue Version erscheinen kurz unten rechts (am Handy über der unteren Leiste), mit Link zur passenden Seite. Eigene Einträge, auch aus einem anderen Tab, lösen keine Meldung aus.
- Glocke in der Kopfzeile: zeigt die Zahl ungelesener Benachrichtigungen und den Verlauf. Dort lässt sich das Einblenden je Gerät ausschalten; der Verlauf füllt sich weiter. Funktioniert vollständig offline.

## [0.2.0] - 2026-11-15

### Neu

- Einsatzbericht als PDF-Datei, direkt im Browser erzeugt: zum Herunterladen, im ZIP-Export und als Anhang beim Senden per E-Mail. Das Format des Mail-Anhangs ist wählbar, voreingestellt ist PDF.
- Einsätze lassen sich nachträglich bearbeiten: Stichwort, Ort (auch per Standort), eigene Einheit und Beginn. Der Knopf „Bearbeiten“ steht beim aktiven Einsatz auf der Startseite und bei jedem Einsatz in der Liste. Beim gemeinsamen Arbeiten sehen alle Geräte die Änderung sofort.
- Jede Änderung der Einsatzdaten wird im Einsatztagebuch als Notiz mit altem und neuem Wert vermerkt, auch ein über die Karte gesetzter Einsatzort.
- Links zu „Hilfe und Feedback“ (Fehler melden, Verbesserung vorschlagen) und zum Quellcode auf GitHub, in der Seitenleiste, unter „Mehr“ und bei den Hinweisen.
- Kurzcode für „Gemeinsam arbeiten“ auch bei selbst gehosteten Installationen (Docker, ZIP): Sie nutzen den Vermittlungsdienst des Lagekit-Projekts. Abschaltbar mit `LAGEKIT_KURZCODE_DIENST=false`, im Docker-Image ohne neuen Build.
- Datenschutzhinweis beim Kurzcode: welcher Dienst genutzt wird und welche Angaben darüber laufen.
- Seite „Export, Druck, Mail“: alles zum Einsatz als eine ZIP-Datei (Einsatzbericht, Tagebuch, Strahlenexposition und Suchverlauf als CSV, Sicherung zum Wiedereinlesen, dazu Dateien wie Fotos oder Drohnenaufnahmen).
- Einsatzbericht mit allen Daten zum Drucken oder als PDF.
- Per E-Mail senden ohne Server: Lagekit öffnet das eigene Mailprogramm mit Betreff und Kurzbericht; auf iPhone, iPad, Android und unter Windows lässt sich die Datei direkt an Mail oder Outlook teilen.
- Ordner verknüpfen (Chrome und Edge am PC): Lagekit prüft z. B. den Ordner mit Drohnenaufnahmen alle 15 Sekunden, meldet neue Dateien und nimmt sie in den ZIP-Export mit.
- Tool „Dateien“: verknüpfte Ordner durchsehen, Unterordner, Suche und Vorschau für Bilder, Videos, PDF und Text.
- Einsatztagebuch: „/“ im Textfeld oder die Büroklammer verknüpft eine Datei; der Verweis lässt sich in der Liste antippen und öffnet die Vorschau.

### Behoben

- Docker-Image: In der GitHub Container Registry erscheinen nur noch die Plattformen amd64 und arm64, kein Eintrag „unknown/unknown“ mehr.
- Der Vermittlungsdienst auf Vercel startete nicht mehr, Kurzcodes schlugen fehl.

### Daten

- Lokale Datenbank auf Version 6: neue Tabelle für verknüpfte Ordner. Vorhandene Daten bleiben unverändert.

## [0.1.0] - 2026-11-15

Erste Version für den Praxistest.

### Neu

- Offline-fähige App: Nach dem ersten Laden läuft Lagekit ohne Netz und lässt sich als App installieren.
- Einsätze anlegen, wechseln und abschließen; alle Daten bleiben auf dem Gerät.
- Sicherung als JSON-Datei für Backup und Übernahme auf ein anderes Gerät.
- Tool Strahlenexposition mit Richtwerten, Werten je Trupp und Ortsdosisleistung in Sv/h.
- Tool Einsatztagebuch mit fortlaufender Nummer; Einträge werden nie verändert.
- Gemeinsam arbeiten (Beta): mehrere Geräte an einem Einsatz, Beitritt über Kurzcode, QR-Code oder Datei.
- Suche über alle Tools und Sammlung externer Recherche-Seiten mit Suchverlauf je Einsatz.
- Standort und Karte (OpenStreetMap).
- Arbeitsbereich: mehrere Tools nebeneinander, Aufteilung frei wählbar, Felder per Ziehen belegen.
- Darstellung hell, dunkel oder wie im System.
- Vor einem Update zeigt die App, was sich ändert und ob gespeicherte Daten umgebaut werden.
- Fertiges Docker-Image zum Selbsthosten unter `ghcr.io/sebiweise/lagekit`.

### Daten

- Lokale Datenbank auf Version 5: Einsätze, Einstellungen, Strahlenexposition, Einsatztagebuch und Suchverlauf.
