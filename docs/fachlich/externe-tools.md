# Externe Tools

Lagekit verlinkt nützliche Online-Dienste für Stoffrecherche, Rettungskarten, Vegetationsbrand, Hochwasser, Warnungen, Kontakte und Karten. Die Seite liegt unter `/tools/recherche/`, der Katalog in `src/tools/recherche/katalog.ts`.

## So funktioniert es

- **Alle Tools sind immer da.** Passend zu Stichwort und Ort des aktiven Einsatzes stehen einige oben unter „Passend zu …“, alle übrigen darunter nach Thema.
- **Vorschläge** kommen aus Schlagworten in `logic.ts` (z. B. „ABC“, „Gefahrgut“, „UN1005“ → Gefahrstoffe; „VU“, „Pkw“, „BAB“ → Rettungskarten; „Wald“, „Flächenbrand“ → Vegetationsbrand). Kontakte und Karten passen immer, lösen aber allein keinen Vorschlagsblock aus.
- **Direktsuche:** Wo das Ziel eine Suche über die Adresse erlaubt, öffnet „Suchen“ direkt die Treffer. Der Ort wird aus dem Einsatz vorbelegt.
- **Begriff kopieren und öffnen:** Wo es keine prüfbare Direktsuche gibt, legt Lagekit den Begriff in die Zwischenablage und öffnet das Tool. Dort nur noch einfügen.
- **Suchverlauf:** Jede aus Lagekit gestartete Suche wird beim aktiven Einsatz gespeichert (Tabelle `rechercheSuchen`), mit Zeit, Tool, Begriff, Ort und Adresse. „Erneut öffnen“ ruft sie wieder auf. Der Verlauf läuft mit Export/Import, Löschen und „Gemeinsam arbeiten“ mit.
- **Offline:** Die Seite selbst und der Verlauf funktionieren ohne Netz. Die Ziele brauchen Internet; ohne Netz zeigt die Seite einen Hinweis.

## Prüfprotokoll (14.11.2026)

Aufgenommen wurde nur, was tatsächlich abgerufen wurde. Viele Seiten rendern per JavaScript oder sperren automatische Abrufe; deren Suchadressen sind deshalb nicht als Direktsuche eingetragen.

| Tool | Adresse | Direktsuche | Prüfung |
| --- | --- | --- | --- |
| Das Örtliche | dasoertliche.de | `?kw={q}&ci={ort}&form_name=search_nat` | Suche „Apotheke“/„Kassel“ lieferte 54 Treffer |
| Google Maps | google.com/maps | `/maps/search/?api=1&query={q}` | Dokumentiert in Google „Maps URLs“ |
| GESTIS | gestis.dguv.de | nein (nur Datenblatt per ZVG-Nr. dokumentiert) | Startseite 200 |
| ERI-Cards | ericards.net | nein | Startseite 200 |
| CAMEO Chemicals | cameochemicals.noaa.gov | nein (Suchseite für Abruf gesperrt) | Startseite 200 |
| PubChem | pubchem.ncbi.nlm.nih.gov | nein (`#query=` nur im Browser prüfbar) | Startseite 200 |
| Giftinformationszentren | bfr.bund.de | – | Liste mit Nummern, 200 |
| ODL-Info | odlinfo.bfs.de | nein | Kartenseite 200 |
| Rettungskarten | adac.de | nein (Linkliste je Hersteller) | 200 |
| Euro Rescue Web | rescue.euroncap.com | nein | 200 |
| GWIS/EFFIS | forest-fire.emergency.copernicus.eu | – | Viewer 200 |
| NASA FIRMS | firms.modaps.eosdis.nasa.gov/map | – | 200 |
| Warnungen (NINA) | warnung.bund.de/meldungen | – | 200 |
| Hochwasserportal | hochwasserzentralen.de | – | 200 |
| Pegelonline | pegelonline.wsv.de | – | 200 |

## Kandidaten, die noch geprüft werden müssen

Diese sind sinnvoll, ließen sich aber nicht automatisch abrufen. Bitte einmal im Browser antippen; was funktioniert, kommt in den Katalog.

- DWD Waldbrandgefahrenindex: `https://www.dwd.de/DE/leistungen/waldbrandgef/waldbrandgef.html`
- DWD Graslandfeuerindex: `https://www.dwd.de/DE/leistungen/graslandfeuerindex/graslandfeuerindex.html`
- DWD Wetterwarnungen: `https://www.dwd.de/DE/wetter/warnungen/warnWetter_node.html`
- OpenStreetMap-Suche: `https://www.openstreetmap.org/search?query={q}` (nur aus einer Community-Antwort bekannt)
- Wikipedia-Suche: `https://de.wikipedia.org/w/index.php?search={q}`
- PubChem-Suche: `https://pubchem.ncbi.nlm.nih.gov/#query={q}`
- OpenFireMap (Hydranten): `https://openfiremap.de/`
- Gelbe Seiten / Das Telefonbuch (Abruf gesperrt)

## Neues Tool aufnehmen

1. Adresse im Browser öffnen, bei Direktsuche eine Beispielsuche ausführen und die Adresse aus der Adresszeile nehmen.
2. Eintrag in `katalog.ts` mit `geprueft` (Datum und wie) ergänzen; ohne Direktsuche `kopierHinweis` setzen, wenn das Ziel ein Suchfeld hat.
3. Passende Schlagworte in `logic.ts` ergänzen und in `logic.test.ts` absichern.
