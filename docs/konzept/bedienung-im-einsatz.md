# Bedienung im Einsatz

Leitfragen: Was braucht die Mannschaft im ELW oder an der Einsatzstelle unter Stress, mit Handschuhen, auf dem iPhone oder am PC? Was machen andere Führungsunterstützungs-Tools (Einsatztagebuch-Apps, Lagekarten-Tools, Alarmierungs-Apps, Atemschutzüberwachung) gut?

## Beobachtungen vor dem Umbau

- Der aktive Einsatz stand klein rechts oben; auf dem Handy war kaum zu sehen, in welchem Einsatz man gerade schreibt.
- Navigation oben, auf dem Handy außerhalb der Daumenreichweite; die Tools selbst waren nur über die Startseite erreichbar.
- Startseite: viel Erklärtext, große Uhr und Gerätestatus vor den Tools; kein Stand der Tools auf einen Blick.
- Strahlenexposition: Formular „Person anlegen“ ganz oben, auch wenn alle Personen längst erfasst sind; keine Übersicht wie auf der Tafel; auf dem iPhone lief die Seite seitlich über (Richtwert-Auswahl, Tabelle).
- Einsatztagebuch: auf dem Handy erst fünf Felder, dann das Inhaltsfeld; Art über eine Auswahlliste (zwei Tipper); Tastaturhinweise auch auf Touch-Geräten.
- Einsatzverwaltung: Formular „Neuer Einsatz“ vor dem laufenden Einsatz.

## Grundsätze

1. **Kontext immer sichtbar.** Stichwort, Laufzeit, Ort und Gerätezeit stehen in einer festen Kopfzeile auf jeder Seite. Ohne Einsatz ist die Leiste ein deutlicher Hinweis mit Knopf.
2. **Daumenzone.** Auf Handy und Tablet liegt die Navigation unten (Start, Tagebuch, Strahlen, Suche, Mehr), mit Symbol und Text, 64 px hoch. Am PC im ELW (ab 1024 px) steht sie als feste Seitenleiste links mit allen Bereichen, ohne „Mehr“; neue Tools wachsen nach unten statt zur Seite. Die Strahlenexposition nutzt ab 1536 px zwei Spalten (Personen links, Übersicht und Steuerung rechts).
3. **Lage zuerst.** Die Startseite zeigt je Tool den Stand (Einträge, letzter Eintrag; Personen im Bereich, schlechteste Ampel). Ohne Einsatz beginnt sie mit dem Formular: ein Schritt bis zum Einsatz.
4. **Häufiges oben, Seltenes eingeklappt.** Formulare zum Anlegen klappen ein, sobald es Daten gibt. Richtwert ändern, Person löschen, Nachtragen liegen hinter einer Zeile.
5. **Ein Tipper statt zwei.** Art im Tagebuch als Knöpfe; Von/An tauschen per Knopf (Rückmeldung); Enter-Taste der Bildschirmtastatur heißt „Senden“.
6. **Große Flächen, keine seitliche Verschiebung.** Mindestens 44 px, meist 48 px; nichts läuft auf 390 px Breite über.
7. **Farbe nie allein.** Ampeln haben immer Text oder einen Screenreader-Text.

## Arbeitsbereich selbst anordnen

Am PC im ELW (ab 1024 px) lässt sich der Arbeitsbereich frei aufteilen; auf Handy und schmalen Tablets bleibt es bei einem Tool mit Tabs.

- **Aufteilung** rechts in der Tableiste: ein Tool, zwei nebeneinander, zwei übereinander, drei (eins groß links, zwei rechts) oder vier im Raster.
- **Feld belegen** auf drei Wegen, je nach Vorliebe: Auswahlliste im Kopf jedes Felds (auch per Tastatur), einen Tab auf ein Feld ziehen, oder Feld anklicken und dann einen Tab antippen. Steht ein Tool schon in einem anderen Feld, tauschen die beiden Felder. Den Griff (⠿) im Feldkopf ziehen, um ein Tool in ein anderes Feld zu verschieben.
- **Größe** über die Trenner zwischen den Feldern ziehen (20 bis 80 %); Pfeiltasten ändern in 5-%-Schritten, Doppelklick oder Pos1 teilt gleichmäßig.
- **Gespeichert** wird alles pro Gerät im Browser (`lagekit.arbeitsbereich`): Tabs, Aufteilung, Belegung und Größen. Nichts davon geht in den Gemeinsam-Modus; jedes Gerät hat seine eigene Anordnung. Wer zurück auf ein Tool schaltet und später wieder auf vier, findet die alte Belegung wieder.
- Die Felder füllen den Bildschirm bis unten und scrollen einzeln; die Karte passt sich der Feldhöhe an. Offene Tabs bleiben geladen, halb ausgefüllte Eingaben gehen beim Umordnen nicht verloren.

## Weitere Ideen (nicht in diesem Umbau)

- Tagebuch-Schnellerfassung von jeder Seite aus (schwebender Knopf).
- Vorlagen für häufige Einträge („Lagemeldung an Leitstelle“, „Trupp zurück“).
- Erinnerung bei laufenden Aufenthalten (Ton/Vibration, wenn die Restzeit unter 10 min fällt).
- Hoher-Kontrast-Modus für Sonnenlicht, abgestimmt mit dem Farbschema.
- Größere Schrift als Einstellung für Tablets im Fahrzeug.
- Mehrere benannte Arbeitsbereiche (z. B. „Strahlenschutz“, „Lage“) zum schnellen Umschalten.
