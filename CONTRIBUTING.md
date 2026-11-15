# Mitmachen bei Lagekit

Danke, dass Sie Lagekit verbessern wollen. Lagekit ist ein Werkzeug für Einsatzkräfte; jede Änderung muss im ELW ohne Netz zuverlässig funktionieren.

## Grundregeln

Diese Regeln gelten für jeden Beitrag; Hintergrund steht in [Architektur und Grundsätze](docs/architektur.md):

1. **Offline-first:** Alles läuft im Browser. Keine Server Actions, keine extern geladenen Schriften oder Skripte, keine neuen Server-Abhängigkeiten.
2. **Nur lokal speichern:** Kein Konto, kein Backend, kein Tracking.
3. **Nachvollziehbar rechnen:** Rechenlogik steht in reinen Funktionen (`logic.ts`) mit Tests. Die Oberfläche zeigt Formel und Eingangswerte.
4. **Einsatztauglich:** Große Bedienflächen, Tastaturbedienung, Dunkelmodus, automatisches Speichern.
5. **Modular:** Ein neues Tool fasst bestehende Tools nicht an.

## Fragen, Fehler, Ideen

- Fehler und Wünsche über die [Issue-Vorlagen](https://github.com/sebiweise/lagekit/issues/new/choose).
- Fachliche Hinweise (Formeln, Richtwerte, Vorschriften) über die Vorlage „Fachliche Prüfung“, immer mit Quelle.
- Sicherheitsprobleme vertraulich, siehe [SECURITY.md](SECURITY.md).
- Keine echten Einsatzdaten in Issues oder Pull Requests.

## Entwicklung

```bash
npm install -g pnpm@12   # Corepack fehlt ab Node.js 25
pnpm install
pnpm dev
```

Vor jedem Pull Request:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

`pnpm test:e2e` braucht einmalig `pnpm exec playwright install chromium`.

## Ein neues Tool anlegen

1. Ordner `src/tools/<tool-id>/` mit `manifest.ts`, `schema.ts` (Zod), `logic.ts` (reine Funktionen), `logic.test.ts`, `repository.ts`, `components/` und `export.ts`.
2. Jede Tabelle braucht die Felder `id` und `einsatzId` (beide indiziert) und steht mit ihrem Schema in `manifest.tabellen`. Dann funktionieren Sicherung, Import und Löschen je Einsatz ohne weitere Arbeit.
3. Tabellen als **neue Version** in `src/core/db/migrations.ts` anlegen; bestehende Versionen nie ändern.
4. Manifest in `src/tools/registry.ts` eintragen und die Seite unter `src/app/tools/<tool-id>/page.tsx` anlegen.
5. Fachliche Grundlage unter `docs/fachlich/<tool-id>.md` mit Quellen festhalten.
6. Einen Playwright-Test unter `e2e/` für den Hauptablauf schreiben.

## Pull Requests

- Ein Thema je Pull Request, Beschreibung auf Deutsch.
- Änderungen, die Nutzer merken, unter **Unveröffentlicht** in [CHANGELOG.md](CHANGELOG.md) eintragen. Die App zeigt diese Liste vor jedem Update. Alles, was gespeicherte Daten umbaut oder zurücksetzt (auch `localStorage`), gehört unter `### Daten`. Neue Datenbank-Versionen in `src/core/db/migrations.ts` brauchen eine `beschreibung`; die App zeigt sie vor dem Update von selbst an. Der CI-Job „Changelog-Eintrag“ meldet einen Pull Request, der App-Code ändert, aber `CHANGELOG.md` nicht; bei Änderungen ohne Auswirkung für Nutzer (z. B. reines Refactoring) das Label `kein-changelog` setzen. Dependabot- und Release-PRs sind ausgenommen.
- Die CI (Lint, Typen, Unit-Tests, Build, Offline-Test) muss grün sein.
- Gemergt wird per Squash.
- Mit dem Einreichen stimmen Sie zu, dass Ihr Beitrag unter der [AGPL-3.0](LICENSE) steht.

## Releases

Versionen folgen [Semantic Versioning](https://semver.org/lang/de/): `patch` nur für Fehlerbehebungen, `minor` für neue Funktionen, `major` für Änderungen, nach denen alte Sicherungen oder Abläufe nicht mehr passen.

1. Unter **Actions → Release vorbereiten → Run workflow** die Art wählen. Der Workflow macht aus „Unveröffentlicht“ in `CHANGELOG.md` die neue Version, erhöht `version` in `package.json` und öffnet den Pull Request „Release vX.Y.Z“. Die CI für diesen Pull Request startet er selbst.
2. Pull Request prüfen (Text der Änderungen ggf. nachschärfen) und mergen.
3. Nach dem Merge legt der Workflow **Release** das Tag `vX.Y.Z` und das GitHub-Release mit dem Abschnitt aus `CHANGELOG.md` und `lagekit-X.Y.Z.zip` an und veröffentlicht das Docker-Image `ghcr.io/sebiweise/lagekit`.

Lokal geht Schritt 1 auch mit `node scripts/release.mjs vorbereiten minor`.

Einmalig in den Repository-Einstellungen: unter **Settings → Actions → General** „Allow GitHub Actions to create and approve pull requests“ einschalten. Das Paket `lagekit` ist nach dem ersten Release unter **Packages** zunächst privat und muss dort auf „Public“ gestellt werden, damit `docker pull` ohne Anmeldung geht.
