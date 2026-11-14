# Lagekit: Projektplan für die Offline-Toolbox im ELW (Katastrophenschutz)

Nov 14, 2026 · @Sebastian Goscinski

## Ziel und Leitprinzipien

Eine frei nutzbare Web-Toolbox, die Einsatzkräften im ELW Erfassung, Dokumentation und Rechenarbeit abnimmt. Sie wird einmal im Browser geöffnet und läuft danach vollständig ohne Netz.

- **Offline-first:** Nach dem ersten Laden funktioniert jede Funktion ohne Internet. Kein Tool darf einen Server voraussetzen.
- **Nur lokal speichern:** Alle Daten bleiben im Browser des Geräts. Kein Konto, kein Backend, kein Tracking.
- **Export statt Cloud:** Jedes Tool exportiert als PDF (für die Akte), CSV (für Tabellen) und JSON (Sicherung und Übernahme auf ein anderes Gerät).
- **Einsatztauglich:** Große Bedienelemente, Tastaturbedienung, Dunkelmodus, automatisches Speichern bei jeder Eingabe.
- **Nachvollziehbar:** Jede Berechnung zeigt Formel und Eingangswerte, damit sie von Hand geprüft werden kann.
- **Modular:** Jedes Tool ist ein eigenes Modul. Neue Tools kommen dazu, ohne bestehende anzufassen.

## Tools im MVP

Der MVP besteht aus zwei Tools plus der gemeinsamen Einsatz-Verwaltung: Einsatztagebuch und Strahlenexposition.

### Gemeinsame Basis: Einsatz

Ein Einsatz ist die Klammer für alle Tool-Daten: Stichwort, Ort, Beginn, Ende, eigene Einheit. Jedes Tool speichert seine Einträge unter einem Einsatz. Export und Import laufen pro Einsatz oder für alles.

### Einsatztagebuch

- Schnellerfassung mit einer Eingabezeile: Zeit wird automatisch gesetzt, Enter speichert.
- Felder je Eintrag: laufende Nummer, Zeitstempel, von/an, Inhalt, Art (Meldung, Befehl, Lage, Maßnahme, Notiz), Verfasser.
- Einträge sind nicht löschbar und nicht überschreibbar. Korrekturen entstehen als neuer Eintrag mit Verweis auf den alten; der alte wird als korrigiert markiert.
- Filter nach Art und Volltextsuche.
- Export: PDF als fortlaufendes Tagebuch mit Kopf (Einsatz, Einheit, Zeitraum) und Seitenzahlen, dazu CSV und JSON.

### Strahlenexposition (Dosisüberwachung)

Das Tool bildet die Tabelle vom Whiteboard ab: Ort, Beginn, Ende, Dauer, Ortsdosisleistung (ODL), Dosis, Gesamtdosis.

- Personen und Trupps anlegen; je Person eine Liste von Aufenthalten.
- Je Aufenthalt: Ort, Zeit Beginn, Zeit Ende, ODL mit Einheit (µSv/h oder mSv/h). Dauer und Dosis werden berechnet.
- Gesamtdosis je Person über alle Aufenthalte, mit Ampel gegen einstellbare Richtwerte.
- Laufender Aufenthalt: Start per Knopf, Live-Anzeige der bisher aufgenommenen Dosis und der verbleibenden Zeit bis zum Richtwert.
- Vorplanung: Wie lange darf ein Trupp bei gegebener ODL bleiben?
- Abgelesener Dosimeterwert kann zusätzlich eingetragen werden; gemessen und berechnet stehen nebeneinander.
- Export: Dosisnachweis je Person als PDF, Gesamtübersicht als CSV und JSON.

```latex
D = \dot{H} \cdot t \qquad D_{\text{gesamt}} = \sum_i \dot{H}_i \cdot t_i
```

Voreingestellte Dosisrichtwerte nach FwDV 500, aus dem Gedächtnis und vor Veröffentlichung gegen die aktuelle Fassung zu prüfen:

| Einsatzanlass | Richtwert |
| --- | --- |
| Schutz von Sachwerten | 15 mSv je Einsatz |
| Abwehr von Gefahren für Personen, Verhinderung einer wesentlichen Schadensausweitung | 100 mSv je Einsatz und Kalenderjahr |
| Rettung von Menschenleben | 250 mSv je Einsatz und einmal im Leben |

## Weitere Tool-Ideen

Diese Tools passen in dasselbe Gerüst und kommen nach dem MVP, in der Reihenfolge des Bedarfs aus der Praxis.

- Atemschutzüberwachung mit Druck- und Zeitkontrolle
- Kräfte- und Einsatzmittelübersicht (wer ist wo, seit wann)
- Nachrichtenvordruck (Vierfach-Vordruck) digital mit PDF-Ausgabe
- Messprotokoll für ABC-Einsätze (Messpunkte, Werte, Zeiten)
- Rechner: Einheiten (Sv, Gy, Bq), Abstandsgesetz, Aufenthaltszeit
- Dekon-Dokumentation (Personen, Zeiten, Kontaminationsnachweis)
- Kommunikationsplan und Funkskizze
- Checklisten je Einsatzstichwort, selbst editierbar

## Architektur und Tech-Stack

Die Anwendung ist eine statisch exportierte Next.js-PWA ohne Backend: Ein Service Worker hält alle Dateien vor, die Daten liegen in IndexedDB.

| Baustein | Wahl | Grund |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript, `output: 'export'` | Reine statische Dateien, überall hostbar, auch auf einem Rechner im ELW |
| Offline | Service Worker mit Precache aller Routen (Serwist) und Web-App-Manifest | Läuft nach dem ersten Laden ohne Netz, als App installierbar |
| Speicher | IndexedDB über Dexie | Große Datenmengen, Transaktionen, Schema-Migrationen |
| Validierung | Zod-Schemas je Tool | Gleiche Schemas für Formular, Speicher und Import |
| UI | Tailwind CSS und shadcn/ui | Schnell, zugänglich, Dunkelmodus |
| Export | JSON und CSV direkt im Browser, PDF über Druckansicht mit Print-CSS | Keine schwere PDF-Bibliothek nötig, funktioniert offline |
| Tests | Vitest für Rechenlogik, Playwright mit abgeschaltetem Netz | Dosisberechnung und Offline-Fähigkeit sind die kritischen Punkte |
| Hosting | GitHub Pages, Cloudflare Pages oder Vercel; zusätzlich ZIP-Release zum Selbsthosten | Kein laufender Server nötig |
| Paketmanager | pnpm, Version über das Feld packageManager in package.json festgelegt | Schnelle Installation, strikte Abhängigkeiten, gleiche Version lokal, in CI und auf Vercel |

Versionen und Kompatibilität der Bibliotheken beim Projektstart gegen die aktuelle Dokumentation prüfen.

Drei technische Regeln gelten von Anfang an:

1. Alles läuft clientseitig. Keine Server Actions, keine API-Routen, keine extern geladenen Schriften oder Skripte.
2. Die App fordert dauerhaften Speicher an (`navigator.storage.persist()`) und zeigt an, ob er gewährt wurde.
3. Die App zeigt sichtbar den Status "offline bereit" und die installierte Version; Updates werden erst nach Bestätigung aktiviert, nie mitten im Einsatz.

## Repo-Struktur und Tool-Module

Jedes Tool liegt in einem eigenen Ordner und meldet sich über ein Manifest an; die Startseite baut ihre Kacheln aus dieser Liste.

```
src/
  app/                    Routen: Startseite, /einsatz, /tools/[tool]
  core/
    db/                   Dexie-Instanz, Migrationen
    einsatz/              Einsatz-Verwaltung
    export/               JSON, CSV, Druckansicht
    pwa/                  Service Worker, Update- und Offline-Status
  tools/
    einsatztagebuch/
    strahlenexposition/
      manifest.ts         Name, Icon, Route, Schema-Version
      schema.ts           Zod-Schemas
      logic.ts            reine Rechenfunktionen, voll getestet
      components/
      export.ts
  components/ui/
docs/                     Fachliche Grundlagen, Beitragsleitfaden
```

Rechenlogik steht immer in `logic.ts` ohne UI-Abhängigkeit. So lässt sie sich testen und fachlich prüfen, ohne die Oberfläche zu lesen.

## Meilensteine

Fünf Schritte führen zur ersten öffentlichen Version; jeder endet mit etwas, das sich im Gerätehaus ausprobieren lässt.

1. **M0 Gerüst:** Repo, Next.js mit Static Export, PWA mit Offline-Nachweis (Playwright-Test ohne Netz), Dexie, CI, Deployment. Ergebnis: leere App, die offline startet.
2. **M1 Einsatz und Export:** Einsatz anlegen, wechseln, abschließen. JSON-Export und -Import für alles. Ergebnis: Daten überleben einen Gerätewechsel.
3. **M2 Strahlenexposition:** Personen, Aufenthalte, Dosisberechnung, Ampel, Vorplanung, PDF-Nachweis. Ergebnis: Die Whiteboard-Tabelle ist ersetzt.
4. **M3 Einsatztagebuch:** Schnellerfassung, Korrekturen, Filter, PDF-Tagebuch. Ergebnis: ein Übungsabend wird komplett digital mitgeschrieben.
5. **M4 Praxistest und v1.0:** Test bei einer Übung auf dem ELW-Rechner und einem Tablet, Rückmeldungen einarbeiten, Dokumentation, Release.

Strahlenexposition kommt vor dem Tagebuch, weil sie kleiner ist, klar prüfbare Rechenergebnisse liefert und das Tool-Modul-Konzept früh belastet.

## Risiken, Haftung, Datenschutz

Das größte Risiko ist Datenverlust im Browser, das zweitgrößte ein falsches Rechenergebnis, dem jemand vertraut.

| Risiko | Gegenmaßnahme |
| --- | --- |
| Browser löscht lokale Daten (Safari räumt selten genutzte Seiten auf, Nutzer leert Verlauf) | Dauerhaften Speicher anfordern, Installation als App empfehlen, Erinnerung an Export bei Einsatzende, automatischer Sicherungs-Download optional |
| Rechenfehler bei der Dosis | Reine Funktionen mit Tests, Einheiten immer explizit, Formel und Eingangswerte sichtbar, fachliche Gegenprüfung durch einen ABC-Ausbilder |
| App wird als Messgerät missverstanden | Deutlicher Hinweis: Hilfsmittel zur Dokumentation, ersetzt weder Dosimeter noch die Verantwortung der Einsatzleitung |
| Update mitten im Einsatz | Neue Version wird nur nach Bestätigung aktiv |
| Personenbezogene Daten (Namen mit Dosiswerten, Tagebuchinhalte) | Bleiben auf dem Gerät; Export liegt in der Verantwortung der Einheit; Hinweis in der Dokumentation, Löschfunktion je Einsatz |
| Service Worker braucht HTTPS oder localhost | Hosting über HTTPS; für Selbsthosting im ELW eine kurze Anleitung |
| Uhrzeit des Geräts falsch | Gerätezeit groß anzeigen, Zeitstempel beim Eintrag korrigierbar |

## Offene Entscheidungen und erste Schritte

Alle vier Entscheidungen sind getroffen.

- [x] **Name und Domain:** Lagekit, Repo \`lagekit\`, Domain lagekit.de (am 14.11.2026 frei, noch zu registrieren; Markenrecherche beim DPMA offen).
- [x] **Lizenz:** AGPL-3.0, damit Änderungen und Ableger offen bleiben.
- [x] **Sprache:** Nur Deutsch zum Start, Texte aber von Beginn an in Sprachdateien.
- [x] **Zielgeräte:** ELW-Rechner mit Tastatur und Tablet. Die Schnellerfassung braucht Tastaturkürzel und große Touch-Flächen.

Danach beginnt M0:

- [x] Repo mit README, Lizenz, Haftungshinweis und diesem Plan unter `docs/`
- [x] Next.js-Projekt mit Static Export, Tailwind, shadcn/ui aufsetzen
- [x] Service Worker und Manifest einrichten, Offline-Test in Playwright schreiben
- [x] Dexie mit Einsatz-Tabelle und Migrationsgerüst anlegen
- [x] CI (Lint, Typen, Tests) einrichten
- [ ] Deployment einrichten (Hosting noch offen)
- [ ] FwDV 500 als fachliche Grundlage für das Strahlenexpositions-Tool in `docs/` zusammenfassen, Richtwerte prüfen
