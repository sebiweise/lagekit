# Fachliche Grundlage: Strahlenexposition (Dosisüberwachung)

Stand: 14.11.2026. Dieses Dokument fasst zusammen, worauf das Tool Strahlenexposition rechnet und welche Werte voreingestellt sind. Vor Version 1.0 prüft ein ABC-Ausbilder die Werte und die Rechnung (siehe Risikotabelle in [PLAN.md](../PLAN.md)).

## Rechnung

Bei gleichbleibender Ortsdosisleistung (ODL) gilt je Aufenthalt:

```
D = Ḣ · t                     Dosis = Ortsdosisleistung × Aufenthaltsdauer
D_gesamt = Σ Ḣᵢ · tᵢ           Summe über alle Aufenthalte einer Person
t_max = (D_Richtwert − D_bisher) / Ḣ    Vorplanung: zulässige Aufenthaltsdauer
```

- Gerechnet wird intern in mSv und Stunden. Die ODL wird mit ihrer Einheit (µSv/h oder mSv/h) gespeichert und erst beim Rechnen umgerechnet (1 mSv/h = 1000 µSv/h).
- Laufende Aufenthalte werden bis zur aktuellen Gerätezeit gerechnet.
- Jede Dosis zeigt ihren Rechenweg, z. B. `D = 0,600 mSv/h × 0,5000 h = 0,300 mSv`.
- Ein abgelesener Dosimeterwert wird zusätzlich gespeichert und neben dem berechneten Wert angezeigt. Für die Ampel zählt der höhere der beiden Werte.
- Ampel: Grün unter 80 % des Richtwerts, Gelb ab 80 %, Rot ab Erreichen des Richtwerts. Die Schwelle steht als `WARN_ANTEIL` in `src/tools/strahlenexposition/logic.ts`.
- Grenzen der Rechnung: Sie unterstellt eine konstante ODL je Aufenthalt und kennt weder Inkorporation noch Kontamination. Sie ersetzt kein Dosimeter.

Code: `src/tools/strahlenexposition/logic.ts`, Tests: `logic.test.ts`.

## Voreingestellte Richtwerte

Die Richtwerte lassen sich im Tool unter „Richtwerte einstellen“ je Gerät ändern.

| Einsatzanlass | Richtwert | Quelle | Status |
| --- | --- | --- | --- |
| Übung | 1 mSv je Übung und Kalenderjahr | FwDV 500 | Angabe aus der Praxis (Feuerwehr), 14.11.2026 |
| Schutz von Sachwerten | 20 mSv | FwDV 500 | Angabe aus der Praxis (Feuerwehr), 14.11.2026 |
| Schutz von Leben oder Gesundheit | 100 mSv | § 114 Abs. 2 StrlSchG | geprüft am Gesetzestext |
| Lebensrettung, Vermeidung schwerer Gesundheitsschäden, Abwehr einer Katastrophe | 250 mSv | § 114 Abs. 3 StrlSchG | geprüft am Gesetzestext |
| Ausnahme, von der Einsatzleitung festgelegt | 500 mSv | § 114 Abs. 3 StrlSchG | geprüft am Gesetzestext |

Aus § 114 StrlSchG (in Kraft seit 1.10.2017):

- Abs. 1: Die Exposition der Einsatzkräfte soll möglichst unter den Grenzwerten für geplante Expositionssituationen (§ 78) bleiben.
- Abs. 2: Ist das zum Schutz von Leben oder Gesundheit nicht möglich, soll die effektive Dosis den Referenzwert von 100 mSv nicht überschreiten. Die Einsatzkräfte sind vorher über die Gesundheitsrisiken zu informieren. Schwangere und Personen unter 18 Jahren dürfen in solchen Situationen nicht eingesetzt werden.
- Abs. 3: Zur Rettung von Leben, zur Vermeidung schwerer strahlungsbedingter Gesundheitsschäden oder zur Abwehr einer Katastrophe gilt ein Referenzwert von 250 mSv. In Ausnahmefällen kann die Einsatzleitung 500 mSv festlegen. Solche Einsätze dürfen nur Freiwillige übernehmen, die vorher informiert wurden.
- Abs. 4: Wer bereits mehr als 250 mSv erhalten hat, soll nicht erneut in Situationen nach Abs. 3 eingesetzt werden.
- Abs. 5: Die Dosen aus allen Notfalleinsätzen werden addiert und auf die Berufslebensdosis angerechnet.

Die Hinweise zu Schwangeren, Minderjährigen und Freiwilligen stehen im Tool beim jeweiligen Richtwert.

## Offene Punkte

- [x] Richtwerte für Sachwerte (20 mSv) und Übungen (1 mSv) aus der Praxis bestätigt. Der ursprünglich geplante Wert von 15 mSv war falsch.
- [ ] Jahressumme je Person über mehrere Einsätze und Übungen: Das Tool rechnet bisher je Einsatz. Für den Übungswert (1 mSv je Kalenderjahr) müsste es die Dosen eines Jahres zusammenführen.
- [ ] Warnschwelle der Ampel (80 %) mit einem ABC-Ausbilder abstimmen.
- [ ] Prüfen, ob die Vorplanung einen Sicherheitszuschlag anbieten soll.

## Quellen

- [§ 114 StrlSchG: Schutz der Einsatzkräfte bei Notfalleinsätzen](https://www.gesetze-im-internet.de/strlschg/__114.html)
- FwDV 500 „Einheiten im ABC-Einsatz“, Stand Januar 2022 (Auszug bei [umwelt-online](https://www.umwelt-online.de/regelwerk/anlasi/sicher/fwdv500_22.htm); dort: „Feuerwehrangehörige sind keine beruflich exponierten Personen, sondern Einsatzkräfte im Sinne des Strahlenschutzgesetzes“)
