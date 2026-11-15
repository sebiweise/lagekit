# Lagekit

Offline-Toolbox für Einsatzkräfte im Einsatzleitwagen (ELW): Erfassung, Dokumentation und Rechenhilfen im Katastrophenschutz. Lagekit wird einmal im Browser geöffnet und läuft danach vollständig ohne Netz. Alle Daten bleiben auf dem Gerät.

> **Haftungshinweis:** Lagekit ist ein Hilfsmittel zur Dokumentation und Berechnung. Es ersetzt weder Messgeräte wie Dosimeter noch die Verantwortung der Einsatzleitung. Alle Ergebnisse sind vor einer Entscheidung zu prüfen. Die Nutzung erfolgt ohne Gewähr (siehe [Lizenz](LICENSE), Abschnitte 15 und 16).

Projektplan, Meilensteine und Architektur: [docs/PLAN.md](docs/PLAN.md).

## Stand

Meilensteine **M0** bis **M3**: Die App startet offline, Einsätze lassen sich verwalten und per JSON-Sicherung auf ein anderes Gerät übertragen, die Dosisüberwachung ersetzt die Whiteboard-Tabelle und das Einsatztagebuch schreibt einen Übungsabend digital mit. Als Nächstes folgt M4 (Praxistest und v1.0).

- Statischer Export mit Next.js (`out/`), kein Server, keine extern geladenen Schriften oder Skripte
- Service Worker (Serwist) mit Precache aller Dateien, Web-App-Manifest, installierbar
- Anzeige "Offline bereit", installierte Version, Netzstatus, dauerhafter Speicher, Gerätezeit
- Updates werden erst nach Klick auf "Jetzt aktualisieren" aktiv, nie mitten im Einsatz
- Lokale Datenbank (IndexedDB über Dexie) mit Einsatz-Tabelle und Migrationsgerüst
- Einsatz-Verwaltung unter `/einsatz/`: anlegen, aktiven Einsatz wechseln, abschließen (mit Erinnerung an die Sicherung), wieder öffnen, löschen mit Rückfrage
- JSON-Sicherung je Einsatz oder für alles; der Import ergänzt vorhandene Daten, bei doppelten Einsätzen gewinnt die neuere Fassung
- CSV-Hilfsfunktion (Semikolon, UTF-8 mit BOM) für die Tool-Exporte
- **Gemeinsam arbeiten (Beta)** unter `/sitzung/`: Ein Gerät leitet die Sitzung, weitere Geräte treten per Kurzcode oder offline per QR-Code bei und werden vom Host zugelassen. Die Daten gehen direkt von Gerät zu Gerät im lokalen Netz. Konzept: [docs/konzept/gemeinsam-arbeiten.md](docs/konzept/gemeinsam-arbeiten.md)
- Tool **Strahlenexposition** unter `/tools/strahlenexposition/`: Personen und Trupps, laufende und nachgetragene Aufenthalte (auch für den ganzen Trupp), Messwertwechsel während des Aufenthalts, ODL in µSv/h, mSv/h oder Sv/h, Dosis D = Ḣ · t mit sichtbarem Rechenweg, Dosimeterwerte, Ampel gegen einstellbare Richtwerte, Restzeit, Vorplanung, Dosisnachweis zum Drucken (PDF) und CSV. Fachliche Grundlage: [docs/fachlich/strahlenexposition.md](docs/fachlich/strahlenexposition.md)
- Tool **Einsatztagebuch** unter `/tools/einsatztagebuch/`: Schnellerfassung (Enter speichert, Zeit automatisch oder als HH:MM nachgetragen), Arten per Alt+1 bis Alt+5, von/an und Verfasser bleiben stehen, Einträge sind weder lösch- noch änderbar, Korrektur als neuer Eintrag mit Verweis, Filter nach Art, Volltextsuche (`/`), Druckfassung mit Kopf auf jeder Seite und Seitenzahlen (PDF), CSV
- Tests: Vitest für Logik und Datenbank, Playwright startet die App bei abgeschaltetem Server


## Daten und Datenschutz

Alle Eingaben werden nur in IndexedDB im Browser des Geräts gespeichert. Es gibt kein Konto, kein Backend und kein Tracking. Für Exporte und ihre Weitergabe ist die nutzende Einheit verantwortlich. Browser können lokale Daten löschen (etwa beim Leeren des Verlaufs); Lagekit fordert deshalb dauerhaften Speicher an und sollte als App installiert werden.

## Entwicklung

Voraussetzungen: Node.js 26 LTS (siehe `.nvmrc`) und pnpm (Version über `packageManager` in `package.json`, z. B. mit `corepack enable`).

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
  app/                 Routen (Startseite, Hinweise)
  core/
    db/                Dexie-Instanz und Migrationen
    einsatz/           Einsatz-Schema (Zod), Datenzugriff, Verwaltung
    export/            JSON-Sicherung, CSV, Datei-Download
    pwa/               Service Worker, Registrierung, Status-Anzeige
  tools/               Tool-Module; Anmeldung über registry.ts
  components/ui/       Bedienelemente (shadcn/ui)
  i18n/                Oberflächentexte
scripts/               Service-Worker-Build, lokaler Server
e2e/                   Playwright-Tests
```

Neue Tools bekommen einen eigenen Ordner unter `src/tools/<tool>/` mit `manifest.ts`, `schema.ts`, `logic.ts` (reine, getestete Rechenfunktionen), `components/` und `export.ts` und werden in `src/tools/registry.ts` eingetragen. Neue Tabellen kommen als neue Version in `src/core/db/migrations.ts` dazu; bestehende Versionen werden nie geändert.

## Selbst hosten

`pnpm build` erzeugt in `out/` reine statische Dateien, die jeder Webserver ausliefern kann. Wichtig: `out/sw.js` entsteht erst nach `next build`. Hoster müssen deshalb den Ordner `out/` als statische Seite ausliefern und dürfen nicht die eigene Next.js-Laufzeit verwenden. Für Vercel legt `vercel.json` das fest (Framework "Other", Ausgabeordner `out`). Der Service Worker funktioniert nur über HTTPS oder auf `localhost`. Die App muss im Wurzelverzeichnis der Domain liegen (`/`), nicht in einem Unterordner.

## Mitmachen

Fehler, Wünsche und fachliche Hinweise über die [Issue-Vorlagen](https://github.com/sebiweise/lagekit/issues/new/choose). Wie Beiträge und neue Tools aussehen, steht in [CONTRIBUTING.md](CONTRIBUTING.md); Sicherheitsprobleme bitte nach [SECURITY.md](SECURITY.md) melden.

## Lizenz

[GNU Affero General Public License v3.0](LICENSE). Änderungen und Ableger bleiben damit offen.
