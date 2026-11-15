# Änderungen

Alle wichtigen Änderungen an Lagekit stehen hier. Die App zeigt diese Liste vor jedem Update an.

Regeln für diese Datei:

- Jeder Pull Request trägt seine Änderung unter **Unveröffentlicht** ein, in Worten für Einsatzkräfte.
- Gruppen: `### Neu`, `### Geändert`, `### Behoben`, `### Entfernt` und `### Daten`.
- Unter `### Daten` steht alles, was beim Update gespeicherte Daten umbaut oder verwirft, auch Einstellungen im Browser. Umbauten der Datenbank meldet die App zusätzlich von selbst aus `src/core/db/migrations.ts`.
- Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Ein Release legt der Workflow „Release vorbereiten“ an, siehe [CONTRIBUTING.md](CONTRIBUTING.md#releases).

## [Unveröffentlicht]

## [0.4.1] - 2026-11-15

### Behoben

- Kopfzeile am Handy (auch als installierte App auf dem iPhone): „Kein Einsatz aktiv“ wurde auf „K…“ gekürzt. Der Knopf zum Anlegen zeigt am Handy nur noch das Plus, die Uhr ist etwas kleiner und Stichwort, Ort und Laufzeit des Einsatzes haben mehr Platz. Am PC bleibt die Kopfzeile wie bisher.

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
