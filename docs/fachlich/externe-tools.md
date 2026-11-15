# Externe Tools

Lagekit verlinkt nützliche Online-Dienste für Stoffrecherche, Rettungskarten, Vegetationsbrand, Hochwasser, Warnungen, Kontakte und Karten. Es gibt zwei Seiten:

- **Suche** (`/suche/`, in der Kopfzeile): ein Suchfeld, darunter die passenden Ziele als große Zeilen und der Verlauf im Einsatz. UN-Nummern („1005“, „UN 1005“) und CAS-Nummern werden erkannt und gehen nur an Stoffdatenbanken.
- **Externe Tools** (`/tools/recherche/`, Kachel auf der Startseite): alle Dienste als kompakte Linksammlung nach Thema, passend zum Einsatz oben.

Der Katalog liegt in `src/tools/recherche/katalog.ts`.

## So funktioniert es

- **Alle Tools sind immer da.** Passend zu Stichwort und Ort des aktiven Einsatzes stehen einige oben unter „Passend zu …“, alle übrigen darunter nach Thema.
- **Vorschläge** kommen aus Schlagworten in `logic.ts` (z. B. „ABC“, „Gefahrgut“, „UN1005“ → Gefahrstoffe; „VU“, „Pkw“, „BAB“ → Rettungskarten; „Wald“, „Flächenbrand“ → Vegetationsbrand). Kontakte und Karten passen immer, lösen aber allein keinen Vorschlagsblock aus.
- **Direktsuche:** Wo das Ziel eine Suche über die Adresse erlaubt, öffnet „Suchen“ direkt die Treffer. Der Ort wird aus dem Einsatz vorbelegt. Eine Direktsuche kann auf Begriffsarten beschränkt sein (`suche.arten`, z. B. PubChem nur für Name und CAS-Nummer), und für UN-Nummern kann ein Tool eine eigene Adresse haben (`unMuster`, z. B. das CAMEO-Datenblatt `/unna/1005`).
- **Begriff kopieren und öffnen:** Wo es keine prüfbare Direktsuche gibt, legt Lagekit den Begriff in die Zwischenablage und öffnet das Tool. Dort nur noch einfügen.
- **Suchverlauf:** Jede aus Lagekit gestartete Suche wird beim aktiven Einsatz gespeichert (Tabelle `rechercheSuchen`), mit Zeit, Tool, Begriff, Ort und Adresse. „Erneut öffnen“ ruft sie wieder auf. Der Verlauf läuft mit Export/Import, Löschen und „Gemeinsam arbeiten“ mit.
- **Offline:** Die Seite selbst und der Verlauf funktionieren ohne Netz. Die Ziele brauchen Internet; ohne Netz zeigt die Seite einen Hinweis.

## Prüfprotokoll

Aufgenommen wurde nur, was tatsächlich abgerufen wurde. Viele Seiten rendern per JavaScript oder sperren automatische Abrufe; deren Suchadressen sind deshalb nicht als Direktsuche eingetragen.

| Tool | Adresse | Direktsuche | Prüfung |
| --- | --- | --- | --- |
| Das Örtliche | mobil.dasoertliche.de | `/Themen?was={q}&wo={ort}` | Im mobilen Browser geprüft (die Desktop-Adresse `?kw=&ci=` verliert mobil die Suche) |
| Google Maps | google.com/maps | `/maps/search/?api=1&query={q}` | Dokumentiert in Google „Maps URLs“ |
| BAM Gefahrgut (DGG-Info) | dgg.bam.de | `/dgginfo/search/query?value={q}&partialWord=true&results=all&lang=de` | Parameter `value` (UN-Nr., Name, Synonym, Formel, CAS) in der BAM-Hilfe dokumentiert |
| OpenStreetMap | openstreetmap.org | `/search?query={q}` | Im Browser geprüft; automatischer Abruf gesperrt |
| CAMEO Chemicals | cameochemicals.noaa.gov | nur UN-Nummer: `/unna/{un}` (ohne führende Nullen) | `/unna/1005` und `/unna/1203` liefern das Datenblatt; Muster aus `/browse/unna`. Textsuche für Abruf gesperrt |
| PubChem | pubchem.ncbi.nlm.nih.gov | nur Name und CAS: `/compound/{q}` | `/compound/ammonia` und `/compound/7664-41-7` lösen auf CID 222 auf. Reine Zahlen wären eine CID, darum nicht für UN-Nummern |
| GESTIS | gestis.dguv.de | nein (JavaScript-App, nur Datenblatt per ZVG-Nr. dokumentiert) | Startseite 200 |
| ERI-Cards | ericards.net/psp/ericards.psp_search | nein (Formular nicht lesbar) | Suchseite 200; die alte Startseite ist nur ein Frameset |
| ChemInfo / GSA | recherche.chemikalieninfo.de | nein | Startseite 200; GSA nur mit Registrierung (Behörden, Einsatzkräfte) |
| Rigoletto (WGK) | webrigoletto.uba.de/rigoletto | nein (Detailseiten nur per Kenn-Nr.) | Startseite 200 |
| Giftinformationszentren | bfr.bund.de | – | Neue Adresse (`…-depro/…`), Verzeichnis Stand 22.07.2026 |
| ODL-Info | odlinfo.bfs.de | nein | Kartenseite 200 |
| EURDEP | remap.jrc.ec.europa.eu | – | 200, ggf. Robot-Prüfung |
| Rettungskarten | adac.de | nein (Linkliste je Hersteller) | 200 |
| Euro Rescue Web | rescue.euroncap.com | nein (JavaScript-App) | 200 |
| GWIS/EFFIS | forest-fire.emergency.copernicus.eu | – | Viewer 200 |
| NASA FIRMS | firms.modaps.eosdis.nasa.gov/map | – | 200 |
| Waldbrand-Gefahrenindex (DWD) | wettergefahren.de/warnungen/indizes/waldbrand.html | – | 200 |
| Grasland-Feuerindex (DWD) | wettergefahren.de/warnungen/indizes/grasland.html | – | 200 |
| Rettungspunkte im Wald (KWF) | kwf-online.de/rettungspunkte | nein | 200, verlinkt Karte, Download und WMS |
| Warnungen (NINA) | warnung.bund.de/meldungen | nein (JavaScript-App ohne Ortsparameter) | 200 |
| Amtliche Warnungen (DWD) | wettergefahren.de/warnungen/warnsituation.html | – | 200 |
| Naturgefahrenportal | naturgefahrenportal.de | – | 200 |
| Hochwasserportal | hochwasserzentralen.de | – | 200 |
| Pegelonline | pegelonline.wsv.de | nein (Pegelseiten nur per UUID) | 200 |
| ELWIS | elwis.de | – | 200 |
| OpenFireMap | openfiremap.org | nein (Positionsparameter nicht prüfbar) | 200 |

## Recherche 11/2026: geprüft, nicht aufgenommen

- **Nur mit Lizenz oder Anmeldung:** MEMPLEX, RESY, Hommel interaktiv, IGS-Fire (NRW), FeWIS (DWD). Wer Zugang hat, nutzt die eigenen Programme.
- **Rettungsdatenblatt per Kennzeichen:** läuft über die Leitstelle, nicht öffentlich.
- **Nicht prüfbar:** THW-Dienststellensuche (Abruf gesperrt), DWD-Seiten unter dwd.de (Abruf gesperrt; die gleichen Inhalte liegen unter wettergefahren.de), Wikipedia-Suche.
- **Offene Schnittstellen für später:** Pegelonline (REST-API mit Stationen und Messwerten, Lizenz DL-DE Zero 2.0) und NINA (Warnungen je Amtlichem Regionalschlüssel) könnten Live-Werte direkt in Lagekit zeigen. Das braucht Netz und wäre ein eigenes Werkzeug mit zwischengespeichertem letzten Stand.

## Neues Tool aufnehmen

1. Adresse im Browser öffnen, bei Direktsuche eine Beispielsuche ausführen und die Adresse aus der Adresszeile nehmen.
2. Eintrag in `katalog.ts` mit `geprueft` (Datum und wie) ergänzen; ohne Direktsuche `kopierHinweis` setzen, wenn das Ziel ein Suchfeld hat.
3. Passende Schlagworte in `logic.ts` ergänzen und in `logic.test.ts` absichern.
