# Lagekit

Offline-Toolbox für Einsatzkräfte im Einsatzleitwagen (ELW): Erfassung, Dokumentation und Rechenhilfen im Katastrophenschutz. Lagekit wird einmal im Browser geöffnet und läuft danach vollständig ohne Netz. Alle Daten bleiben auf dem Gerät.

> **Haftungshinweis:** Lagekit ist ein Hilfsmittel zur Dokumentation und Berechnung. Es ersetzt weder Messgeräte wie Dosimeter noch die Verantwortung der Einsatzleitung. Alle Ergebnisse sind vor einer Entscheidung zu prüfen. Die Nutzung erfolgt ohne Gewähr (siehe [Lizenz](LICENSE), Abschnitte 15 und 16).

## Aufbau der Seite

- `/` Startseite mit Überblick und Links (Geräte, die die App schon nutzen, und installierte Apps springen direkt in die App)
- `/app/` die App selbst; das Web-App-Manifest startet installierte Apps hier
- `/docs/` die Dokumentation aus `docs/`, auch offline verfügbar

Bis Version 0.4 lag die App direkt unter `/`. Alte Adressen wie `/einsatz/` führen weiter in die App, siehe [Selbst betreiben](docs/betrieb/selbst-betreiben.md#alte-adressen-bis-version-04).

## Funktionen

Die App startet offline, Einsätze lassen sich verwalten und per JSON-Sicherung auf ein anderes Gerät übertragen, die Dosisüberwachung ersetzt die Tabelle auf dem Whiteboard und das Einsatztagebuch wird digital mitgeschrieben.

- Statischer Export mit Next.js (`out/`), kein Server, keine extern geladenen Schriften oder Skripte
- Service Worker (Serwist) mit Precache aller Dateien, Web-App-Manifest, installierbar
- Anzeige "Offline bereit", installierte Version, Netzstatus, dauerhafter Speicher, Gerätezeit
- Updates werden erst nach Klick auf "Jetzt aktualisieren" aktiv, nie mitten im Einsatz. Vorher zeigt `/app/aenderungen/`, was die neue Version ändert und ob gespeicherte Daten umgestellt werden ([CHANGELOG.md](CHANGELOG.md))
- Lokale Datenbank (IndexedDB über Dexie) mit Einsatz-Tabelle und Migrationsgerüst
- **Befehlspalette** mit Strg+K (Mac: ⌘K) oder dem Suchknopf in der Kopfzeile, am Handy unter „Mehr“: Tools und Seiten öffnen, Tagebuch-Eintrag schreiben, Einsatz anlegen, bearbeiten oder wechseln, Bericht drucken, Einsatz sichern, Darstellung umschalten und Begriffe direkt in den externen Tools suchen
- Einsatz-Verwaltung unter `/app/einsatz/`: anlegen, aktiven Einsatz wechseln, abschließen (mit Erinnerung an die Sicherung), wieder öffnen, löschen mit Rückfrage
- JSON-Sicherung je Einsatz oder für alles; der Import ergänzt vorhandene Daten, bei doppelten Einsätzen gewinnt die neuere Fassung
- CSV-Hilfsfunktion (Semikolon, UTF-8 mit BOM) für die Tool-Exporte
- **Gemeinsam arbeiten (Beta)** unter `/app/sitzung/`: Ein Gerät leitet die Sitzung, weitere Geräte treten per Kurzcode oder offline per QR-Code bei und werden vom Host zugelassen. Die Daten gehen direkt von Gerät zu Gerät im lokalen Netz. Konzept: [docs/konzept/gemeinsam-arbeiten.md](docs/konzept/gemeinsam-arbeiten.md)
- Tool **Strahlenexposition** unter `/app/tools/strahlenexposition/`: Personen und Trupps, laufende und nachgetragene Aufenthalte (auch für den ganzen Trupp), Messwertwechsel während des Aufenthalts, ODL in µSv/h, mSv/h oder Sv/h, Dosis D = Ḣ · t mit sichtbarem Rechenweg, Dosimeterwerte, Ampel gegen einstellbare Richtwerte, Restzeit, Vorplanung, Dosisnachweis zum Drucken (PDF) und CSV. Fachliche Grundlage: [docs/fachlich/strahlenexposition.md](docs/fachlich/strahlenexposition.md)
- Tool **Einsatztagebuch** unter `/app/tools/einsatztagebuch/`: Schnellerfassung (Enter speichert, Zeit automatisch oder als HH:MM nachgetragen), Arten per Alt+1 bis Alt+5, von/an und Verfasser bleiben stehen, von/an schlagen bereits genutzte Angaben vor (Tab ergänzt), Einträge sind weder lösch- noch änderbar, Korrektur als neuer Eintrag mit Verweis, Filter nach Art, Volltextsuche (`/`), Druckfassung mit Kopf auf jeder Seite und Seitenzahlen (PDF), CSV
- Tests: Vitest für Logik und Datenbank, Playwright startet die App bei abgeschaltetem Server

## Dokumentation

Alle Seiten unter `docs/` erscheinen auch in der App-Website unter `/docs/`.

- Selbst betreiben: [Überblick](docs/betrieb/selbst-betreiben.md), [Docker](docs/betrieb/docker.md), [Statisches Hosting](docs/betrieb/statisch.md), [Vercel](docs/betrieb/vercel.md), [Cloudflare Workers](docs/betrieb/cloudflare.md), [Cloudflare Pages](docs/betrieb/cloudflare-pages.md), [Kurzcode-Dienst](docs/betrieb/kurzcode.md)
- [Architektur und Grundsätze](docs/architektur.md): Leitprinzipien, Technik, Tool-Module, Risiken
- [Bedienung im Einsatz](docs/konzept/bedienung-im-einsatz.md) und [Gemeinsam arbeiten](docs/konzept/gemeinsam-arbeiten.md)
- Fachliche Grundlagen: [Strahlenexposition](docs/fachlich/strahlenexposition.md), [Karte und Standort](docs/fachlich/karte-und-standort.md), [Externe Tools](docs/fachlich/externe-tools.md)
- [Mitmachen](CONTRIBUTING.md), [Sicherheit](SECURITY.md), [Änderungen](CHANGELOG.md)

## Daten und Datenschutz

Alle Eingaben werden nur in IndexedDB im Browser des Geräts gespeichert. Es gibt kein Konto, kein Backend und kein Tracking. Für Exporte und ihre Weitergabe ist die nutzende Einheit verantwortlich. Browser können lokale Daten löschen (etwa beim Leeren des Verlaufs); Lagekit fordert deshalb dauerhaften Speicher an und sollte als App installiert werden. Nur beim Beitritt per Kurzcode laufen Name, Funktion, Fahrzeug und Verbindungsdaten kurz über einen Vermittlungsdienst, siehe [Kurzcode-Dienst](docs/betrieb/kurzcode.md).

## Entwicklung

Voraussetzungen: Node.js 26 LTS (siehe `.nvmrc`) und pnpm (Version über `packageManager` in `package.json`, z. B. mit `npm install -g pnpm@12`; Corepack fehlt ab Node.js 25).

```bash
pnpm install
pnpm dev          # Entwicklungsserver auf http://localhost:3000 (ohne Service Worker)
pnpm build        # Static Export nach out/ und Service Worker out/sw.js
pnpm start        # out/ lokal ausliefern (mit Service Worker)
pnpm lint
pnpm typecheck
pnpm test         # Vitest
pnpm test:e2e     # Playwright, braucht vorher pnpm build
```

### Aufbau

```
src/
  app/                 Routen: Startseite (page.tsx), Dokumentation (docs/), App (app/)
  site/                Inhalt der Dokumentation (Markdown aus docs/ beim Build)
  core/
    aenderungen/       CHANGELOG lesen, Update-Vergleich, Seite „Änderungen“
    db/                Dexie-Instanz und Migrationen
    einsatz/           Einsatz-Schema (Zod), Datenzugriff, Verwaltung
    export/            JSON-Sicherung, CSV, Datei-Download
    pwa/               Service Worker, Registrierung, Status-Anzeige
  tools/               Tool-Module; Anmeldung über registry.ts
  components/ui/       Bedienelemente (shadcn/ui)
  i18n/                Oberflächentexte
scripts/               Service-Worker-Build, Versionsangaben, Release-Hilfe, lokaler Server
docker/                nginx-Konfiguration für das Docker-Image
e2e/                   Playwright-Tests
```

Neue Tools bekommen einen eigenen Ordner unter `src/tools/<tool>/` mit `manifest.ts`, `schema.ts`, `logic.ts` (reine, getestete Rechenfunktionen), `components/` und `export.ts` und werden in `src/tools/registry.ts` eingetragen. Neue Tabellen kommen als neue Version in `src/core/db/migrations.ts` dazu; bestehende Versionen werden nie geändert.

## Selbst hosten

`pnpm build` erzeugt in `out/` reine statische Dateien, die jeder Webserver mit HTTPS ausliefern kann. Zu jedem [Release](https://github.com/sebiweise/lagekit/releases) gibt es ein ZIP mit diesen Dateien und ein Docker-Image:

```bash
docker run -d --name lagekit -p 8080:8080 --restart unless-stopped ghcr.io/sebiweise/lagekit:latest
```

Anleitungen für [Docker](docs/betrieb/docker.md), [eigene Webserver](docs/betrieb/statisch.md) (nginx, Apache, Caddy), [Vercel](docs/betrieb/vercel.md), [Cloudflare Workers](docs/betrieb/cloudflare.md) und [Cloudflare Pages](docs/betrieb/cloudflare-pages.md) sowie zum [Kurzcode-Dienst](docs/betrieb/kurzcode.md) für „Gemeinsam arbeiten“ stehen in der Dokumentation. Wichtig für jede Installation: HTTPS, eigene (Sub-)Domain statt Unterordner, `sw.js` ohne Zwischenspeicher, `404.html` für unbekannte Adressen ([Überblick](docs/betrieb/selbst-betreiben.md)).

## Claude-Skills

Für die Arbeit mit Claude Code sind diese Skills empfohlen. Sie liegen nicht im Repo, sondern werden einmal pro Rechner unter `~/.claude/skills/` installiert und gelten dann für alle Projekte. Cloud-Sessions (Claude Code im Web) sehen sie nicht.

- [apple-design](https://github.com/dickwu/apple-design-skill): Design-Reviews nach Apples Human Interface Guidelines

Windows (PowerShell):

```powershell
git clone https://github.com/dickwu/apple-design-skill.git "$env:USERPROFILE\.claude\skills\apple-design"
```

macOS und Linux:

```bash
git clone https://github.com/dickwu/apple-design-skill.git ~/.claude/skills/apple-design
```

Danach Claude Code neu starten; `/skills` zeigt die installierten Skills. Aktualisieren mit `git pull` im Klon.

## Mitmachen

Fehler, Wünsche und fachliche Hinweise über die [Issue-Vorlagen](https://github.com/sebiweise/lagekit/issues/new/choose). Wie Beiträge und neue Tools aussehen, steht in [CONTRIBUTING.md](CONTRIBUTING.md); Sicherheitsprobleme bitte nach [SECURITY.md](SECURITY.md) melden.

## Lizenz

[GNU Affero General Public License v3.0](LICENSE). Änderungen und Ableger bleiben damit offen.
