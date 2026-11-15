# Änderungen

Alle wichtigen Änderungen an Lagekit stehen hier. Die App zeigt diese Liste vor jedem Update an.

Regeln für diese Datei:

- Jeder Pull Request trägt seine Änderung unter **Unveröffentlicht** ein, in Worten für Einsatzkräfte.
- Gruppen: `### Neu`, `### Geändert`, `### Behoben`, `### Entfernt` und `### Daten`.
- Unter `### Daten` steht alles, was beim Update gespeicherte Daten umbaut oder verwirft, auch Einstellungen im Browser. Umbauten der Datenbank meldet die App zusätzlich von selbst aus `src/core/db/migrations.ts`.
- Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Ein Release legt der Workflow „Release vorbereiten“ an, siehe [CONTRIBUTING.md](CONTRIBUTING.md#releases).

## [Unveröffentlicht]

### Neu

- Einsätze lassen sich nachträglich bearbeiten: Stichwort, Ort (auch per Standort), eigene Einheit und Beginn. Der Knopf „Bearbeiten“ steht beim aktiven Einsatz auf der Startseite und bei jedem Einsatz in der Liste. Beim gemeinsamen Arbeiten sehen alle Geräte die Änderung sofort.
- Jede Änderung der Einsatzdaten wird im Einsatztagebuch als Notiz mit altem und neuem Wert vermerkt, auch ein über die Karte gesetzter Einsatzort.
- Links zu „Hilfe und Feedback“ (Fehler melden, Verbesserung vorschlagen) und zum Quellcode auf GitHub, in der Seitenleiste, unter „Mehr“ und bei den Hinweisen.
- Kurzcode für „Gemeinsam arbeiten“ auch bei selbst gehosteten Installationen (Docker, ZIP): Sie nutzen den Vermittlungsdienst des Lagekit-Projekts. Abschaltbar mit `LAGEKIT_KURZCODE_DIENST=false`, im Docker-Image ohne neuen Build.
- Datenschutzhinweis beim Kurzcode: welcher Dienst genutzt wird und welche Angaben darüber laufen.

### Behoben

- Docker-Image: In der GitHub Container Registry erscheinen nur noch die Plattformen amd64 und arm64, kein Eintrag „unknown/unknown“ mehr.
- Der Vermittlungsdienst auf Vercel startete nicht mehr, Kurzcodes schlugen fehl.

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
