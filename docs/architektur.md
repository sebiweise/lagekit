# Architektur und Grundsätze

Lagekit ist eine Web-Toolbox, die Einsatzkräften im ELW Erfassung, Dokumentation und Rechenarbeit abnimmt. Sie wird einmal im Browser geöffnet und läuft danach vollständig ohne Netz.

## Leitprinzipien

- **Offline-first:** Nach dem ersten Laden funktioniert jede Funktion ohne Internet. Kein Tool setzt einen Server voraus.
- **Nur lokal speichern:** Alle Daten bleiben im Browser des Geräts. Kein Konto, kein Backend, kein Tracking.
- **Export statt Cloud:** Tools exportieren zum Drucken als PDF (für die Akte), als CSV (für Tabellen) und als JSON (Sicherung und Übernahme auf ein anderes Gerät).
- **Einsatztauglich:** Große Bedienelemente, Tastaturbedienung, Dunkelmodus, automatisches Speichern bei jeder Eingabe.
- **Nachvollziehbar:** Jede Berechnung zeigt Formel und Eingangswerte, damit sie von Hand geprüft werden kann.
- **Modular:** Jedes Tool ist ein eigenes Modul. Neue Tools kommen dazu, ohne bestehende anzufassen.

## Technik

Lagekit ist eine statisch exportierte Next.js-PWA: Ein Service Worker hält alle Dateien vor, die Daten liegen in IndexedDB.

| Baustein | Wahl | Grund |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript, `output: 'export'` | Reine statische Dateien, überall hostbar, auch auf einem Rechner im ELW |
| Offline | Service Worker mit Precache aller Routen (Serwist) und Web-App-Manifest | Läuft nach dem ersten Laden ohne Netz, als App installierbar |
| Speicher | IndexedDB über Dexie | Große Datenmengen, Transaktionen, Schema-Migrationen |
| Validierung | Zod-Schemas je Tool | Gleiche Schemas für Formular, Speicher und Import |
| UI | Tailwind CSS und shadcn/ui | Zugänglich, Dunkelmodus |
| Export | JSON und CSV direkt im Browser, PDF über Druckansicht mit Print-CSS | Keine schwere PDF-Bibliothek nötig, funktioniert offline |
| Tests | Vitest für Rechenlogik und Datenbank, Playwright mit abgeschaltetem Server | Rechenergebnisse und Offline-Fähigkeit sind die kritischen Punkte |
| Auslieferung | Statisches Hosting (z. B. Vercel), Docker-Image und ZIP je Release | Kein laufender Anwendungsserver nötig, siehe [README](../README.md#selbst-hosten) |
| Paketmanager | pnpm, Version über `packageManager` in `package.json` | Gleiche Version lokal, in CI und beim Hoster |

Technische Regeln:

1. Alles läuft clientseitig. Keine Server Actions, keine extern geladenen Schriften oder Skripte. Einzige Ausnahme ist der optionale Vermittlungsdienst für den Kurzcode-Beitritt beim gemeinsamen Arbeiten (`api/vermittlung.ts`); er sieht keine Einsatzdaten, und ohne ihn funktioniert der Beitritt per QR-Code oder Datei (siehe [Gemeinsam arbeiten](konzept/gemeinsam-arbeiten.md)).
2. Die App fordert dauerhaften Speicher an (`navigator.storage.persist()`) und zeigt an, ob er gewährt wurde.
3. Die App zeigt sichtbar den Status „Offline bereit“ und die installierte Version. Updates werden erst nach Bestätigung aktiv, nie mitten im Einsatz.

## Tool-Module

Jedes Tool liegt in einem eigenen Ordner unter `src/tools/<tool-id>/` und meldet sich über ein Manifest in `src/tools/registry.ts` an; Startseite, Sicherung und Abgleich bauen auf dieser Liste auf.

```
src/tools/<tool-id>/
  manifest.ts         Name, Symbol, Tabellen, optional Konfliktlösung beim Abgleich
  schema.ts           Zod-Schemas
  logic.ts            reine Rechenfunktionen, voll getestet
  repository.ts       Datenzugriff
  components/
  export.ts
```

Rechenlogik steht immer in `logic.ts` ohne UI-Abhängigkeit. So lässt sie sich testen und fachlich prüfen, ohne die Oberfläche zu lesen. Wie ein neues Tool angelegt wird, steht in [CONTRIBUTING.md](../CONTRIBUTING.md#ein-neues-tool-anlegen).

## Risiken und Gegenmaßnahmen

Die größten Risiken sind Datenverlust im Browser und ein falsches Rechenergebnis, dem jemand vertraut.

| Risiko | Gegenmaßnahme |
| --- | --- |
| Browser löscht lokale Daten (Safari räumt selten genutzte Seiten auf, Verlauf wird geleert) | Dauerhaften Speicher anfordern, Installation als App empfehlen, Erinnerung an die Sicherung bei Einsatzende |
| Rechenfehler, etwa bei der Dosis | Reine Funktionen mit Tests, Einheiten immer explizit, Formel und Eingangswerte sichtbar, fachliche Grundlagen mit Quellen unter [`docs/fachlich/`](fachlich/) |
| App wird als Messgerät missverstanden | Deutlicher Hinweis: Hilfsmittel zur Dokumentation, ersetzt weder Dosimeter noch die Verantwortung der Einsatzleitung |
| Update mitten im Einsatz | Neue Version wird nur nach Bestätigung aktiv; vorher zeigt die App die Änderungen |
| Personenbezogene Daten (Namen mit Dosiswerten, Tagebuchinhalte) | Bleiben auf dem Gerät; Export liegt in der Verantwortung der Einheit; Löschen je Einsatz |
| Service Worker braucht HTTPS oder localhost | Hosting über HTTPS; Hinweise zum Selbsthosten im README |
| Uhrzeit des Geräts falsch | Gerätezeit sichtbar anzeigen, Zeitpunkt beim Eintrag nachtragbar |
