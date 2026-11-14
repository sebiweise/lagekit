## Worum geht es?

<!-- Kurz: Was ändert sich für Einsatzkräfte? Verweis auf Issue, z. B. „Schließt #12“. -->

## Prüfliste

- [ ] Läuft ohne Netz: keine Server-Aufrufe, keine extern geladenen Schriften oder Skripte
- [ ] Daten bleiben lokal; neue Tabellen haben `id` und `einsatzId` und stehen im Tool-Manifest
- [ ] Schema-Änderungen nur als neue Version in `src/core/db/migrations.ts`
- [ ] Rechenlogik steht in `logic.ts` und hat Tests; der Rechenweg ist in der Oberfläche sichtbar
- [ ] Texte auf Deutsch, Bedienung mit Tastatur und Touch (große Flächen) möglich
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` und `pnpm test:e2e` laufen

## Fachliche Auswirkung

<!-- Ändern sich Formeln, Richtwerte oder Begriffe? Dann Quelle angeben und docs/fachlich/ aktualisieren. -->

## Screenshots

<!-- Bei Änderungen an der Oberfläche: Tablet- und Desktop-Ansicht, hell und dunkel. -->
