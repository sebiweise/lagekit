/**
 * Katalog externer Recherche-Tools. Lagekit verlinkt nur; alle Ziele brauchen Internet.
 *
 * Regeln für neue Einträge:
 * - Nur Adressen aufnehmen, die tatsächlich abgerufen wurden (`geprueft`).
 * - `suche` nur, wenn das Muster beim Anbieter dokumentiert ist oder ein Abruf
 *   mit Beispielbegriff echte Treffer geliefert hat. Sonst kopiert Lagekit den
 *   Suchbegriff in die Zwischenablage und öffnet die Startseite.
 * - Platzhalter: `{q}` = Suchbegriff, `{ort}` = Ort (beide URL-kodiert).
 * Prüfprotokoll und Kandidaten: docs/fachlich/externe-tools.md
 */

export const THEMEN = {
  gefahrstoff: "Gefahrstoffe",
  strahlung: "Strahlung",
  fahrzeug: "Fahrzeuge",
  vegetation: "Vegetationsbrand",
  wasser: "Hochwasser",
  warnung: "Warnungen",
  kontakt: "Kontakte",
  karte: "Karten und Orte",
} as const;

export type Thema = keyof typeof THEMEN;

export interface ExternesTool {
  id: string;
  name: string;
  anbieter: string;
  beschreibung: string;
  /** Einstieg, wenn ohne Suchbegriff geöffnet wird. */
  url: string;
  themen: Thema[];
  /** Direktsuche über die Adresse. */
  suche?: {
    muster: string;
    /** Was ins Suchfeld gehört, z. B. „Name oder Branche“. */
    begriff: string;
    /** Ort an den Suchbegriff anhängen (für Ziele ohne eigenes Ortsfeld). */
    ortAnhaengen?: boolean;
  };
  /** Was man nach „Begriff kopieren und öffnen“ dort eingeben kann. */
  kopierHinweis?: string;
  /** Tag der letzten Prüfung (ISO-Datum) und wie geprüft wurde. */
  geprueft: { am: string; wie: string };
}

const PRUEFTAG = "2026-11-14";

export const externeTools: ExternesTool[] = [
  {
    id: "bam-dgg",
    name: "Gefahrgut-Datenbank (DGG-Info)",
    anbieter: "BAM",
    beschreibung: "Gefahrgutdaten nach UN-Nummer, Name, Synonym, Formel oder CAS-Nummer.",
    url: "https://www.dgg.bam.de/",
    themen: ["gefahrstoff"],
    suche: {
      muster: "https://www.dgg.bam.de/dgginfo/search/query?value={q}&partialWord=true&results=all&lang=de",
      begriff: "UN-Nummer, Stoffname oder CAS-Nummer",
    },
    geprueft: { am: PRUEFTAG, wie: "Parameter `value` in der BAM-Hilfe dokumentiert (dgg.bam.de/quickinfo/help/unnumber)." },
  },
  {
    id: "gestis",
    name: "GESTIS-Stoffdatenbank",
    anbieter: "IFA / DGUV",
    beschreibung: "Gefahrstoffe mit Eigenschaften, Schutzmaßnahmen und Erster Hilfe.",
    url: "https://gestis.dguv.de/",
    themen: ["gefahrstoff"],
    kopierHinweis: "Stoffname, CAS- oder UN-Nummer ins Suchfeld einfügen.",
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200). Direktsuche nicht dokumentiert, nur Datenblatt per ZVG-Nummer." },
  },
  {
    id: "ericards",
    name: "ERI-Cards",
    anbieter: "Cefic",
    beschreibung: "Emergency Response Intervention Cards: Erstmaßnahmen nach UN-Nummer.",
    url: "https://ericards.net/",
    themen: ["gefahrstoff"],
    kopierHinweis: "UN-Nummer oder Stoffname einfügen.",
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200). Keine Direktsuche gefunden." },
  },
  {
    id: "cameo",
    name: "CAMEO Chemicals",
    anbieter: "NOAA (englisch)",
    beschreibung: "Stoffdatenblätter mit Reaktivität und Schutzabständen, Suche auch nach UN-Nummer.",
    url: "https://cameochemicals.noaa.gov/",
    themen: ["gefahrstoff"],
    kopierHinweis: "Englischen Stoffnamen oder UN-Nummer einfügen.",
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200). Suchparameter nicht prüfbar." },
  },
  {
    id: "pubchem",
    name: "PubChem",
    anbieter: "NIH (englisch)",
    beschreibung: "Chemische Datenbank: Synonyme, CAS-Nummern, Sicherheitsangaben.",
    url: "https://pubchem.ncbi.nlm.nih.gov/",
    themen: ["gefahrstoff"],
    kopierHinweis: "Stoffname oder CAS-Nummer einfügen.",
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200)." },
  },
  {
    id: "giftnotruf",
    name: "Giftinformationszentren",
    anbieter: "BfR",
    beschreibung: "Liste aller Giftnotrufe in Deutschland mit Telefonnummern.",
    url: "https://www.bfr.bund.de/deutsches-produktregister-de-pro/giftinformationszentren-in-deutschland/",
    themen: ["gefahrstoff", "kontakt"],
    geprueft: { am: PRUEFTAG, wie: "Seite abgerufen (HTTP 200), enthält die Liste mit Nummern." },
  },
  {
    id: "odlinfo",
    name: "ODL-Info",
    anbieter: "Bundesamt für Strahlenschutz",
    beschreibung: "Messnetz der Ortsdosisleistung: rund 1.700 Sonden in Deutschland auf der Karte.",
    url: "https://odlinfo.bfs.de/ODL/DE/themen/wo-stehen-die-sonden/karte/karte_node.html",
    themen: ["strahlung"],
    kopierHinweis: "Ort oder Postleitzahl in die Liste der Messstellen einfügen.",
    geprueft: { am: PRUEFTAG, wie: "Kartenseite abgerufen (HTTP 200)." },
  },
  {
    id: "adac-rettungskarten",
    name: "Rettungskarten (ADAC)",
    anbieter: "ADAC",
    beschreibung: "Rettungskarten aller Hersteller, verlinkt nach Marke.",
    url: "https://www.adac.de/rund-ums-fahrzeug/unfall-schaden-panne/rettungskarte/",
    themen: ["fahrzeug"],
    kopierHinweis: "Hersteller wählen, dort nach dem Modell suchen.",
    geprueft: { am: PRUEFTAG, wie: "Seite abgerufen (HTTP 200): Linkliste je Hersteller, keine Suche." },
  },
  {
    id: "euro-rescue",
    name: "Euro Rescue (Web)",
    anbieter: "Euro NCAP",
    beschreibung: "Rettungsdatenblätter herstellerübergreifend nach Marke und Modell, auch als App.",
    url: "https://rescue.euroncap.com/",
    themen: ["fahrzeug"],
    kopierHinweis: "Marke und Modell auswählen.",
    geprueft: { am: PRUEFTAG, wie: "Seite abgerufen (HTTP 200, „Rescue App on web“)." },
  },
  {
    id: "gwis",
    name: "Waldbrand-Lage Europa (GWIS/EFFIS)",
    anbieter: "Copernicus / JRC",
    beschreibung: "Aktuelle Brände, verbrannte Flächen und Feuergefahr-Indizes auf der Karte.",
    url: "https://forest-fire.emergency.copernicus.eu/apps/gwis_current_situation/index.html",
    themen: ["vegetation"],
    geprueft: { am: PRUEFTAG, wie: "Viewer abgerufen (HTTP 200)." },
  },
  {
    id: "firms",
    name: "NASA FIRMS",
    anbieter: "NASA (englisch)",
    beschreibung: "Satellitenerkannte Feuer der letzten Stunden weltweit.",
    url: "https://firms.modaps.eosdis.nasa.gov/map/",
    themen: ["vegetation"],
    geprueft: { am: PRUEFTAG, wie: "Karte abgerufen (HTTP 200)." },
  },
  {
    id: "warnung-bund",
    name: "Warnungen (NINA)",
    anbieter: "BBK",
    beschreibung: "Aktuelle Warnmeldungen von Bund, Ländern, DWD und Hochwasserzentralen.",
    url: "https://warnung.bund.de/meldungen",
    themen: ["warnung", "wasser", "strahlung"],
    geprueft: { am: PRUEFTAG, wie: "Seite abgerufen (HTTP 200)." },
  },
  {
    id: "hochwasserzentralen",
    name: "Hochwasserportal der Länder",
    anbieter: "LHP",
    beschreibung: "Aktuelle Hochwasserlage, Warnungen und regionale Kontakte.",
    url: "https://www.hochwasserzentralen.de/",
    themen: ["wasser"],
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200)." },
  },
  {
    id: "pegelonline",
    name: "Pegelonline",
    anbieter: "WSV",
    beschreibung: "Wasserstände der Bundeswasserstraßen.",
    url: "https://pegelonline.wsv.de/gast/start",
    themen: ["wasser"],
    kopierHinweis: "Gewässer oder Pegelname in der Pegeltabelle suchen.",
    geprueft: { am: PRUEFTAG, wie: "Startseite abgerufen (HTTP 200)." },
  },
  {
    id: "dasoertliche",
    name: "Das Örtliche",
    anbieter: "Das Örtliche",
    beschreibung: "Telefonbuch: Firmen, Behörden und Personen am Einsatzort.",
    url: "https://www.dasoertliche.de/",
    themen: ["kontakt"],
    suche: {
      muster: "https://mobil.dasoertliche.de/Themen?was={q}&wo={ort}",
      begriff: "Name oder Branche",
    },
    geprueft: {
      am: PRUEFTAG,
      wie: "Mobile Suchadresse im Browser geprüft; die Desktop-Adresse (?kw=&ci=) verliert auf dem Handy die Suche.",
    },
  },
  {
    id: "google-maps",
    name: "Google Maps",
    anbieter: "Google",
    beschreibung: "Adresse oder Objekt am Einsatzort auf der Karte suchen.",
    url: "https://www.google.com/maps/",
    themen: ["karte"],
    suche: {
      muster: "https://www.google.com/maps/search/?api=1&query={q}",
      ortAnhaengen: true,
      begriff: "Adresse oder Objekt",
    },
    geprueft: { am: PRUEFTAG, wie: "Muster aus der Google-Dokumentation „Maps URLs“ (Stand 09.11.2026)." },
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    anbieter: "OpenStreetMap",
    beschreibung: "Freie Karte: Adresse, Objekt oder Straße am Einsatzort suchen.",
    url: "https://www.openstreetmap.org/",
    themen: ["karte"],
    suche: {
      muster: "https://www.openstreetmap.org/search?query={q}",
      begriff: "Adresse oder Objekt",
      ortAnhaengen: true,
    },
    geprueft: {
      am: PRUEFTAG,
      wie: "Suchadresse der OSM-Website im Browser geprüft; automatischer Abruf gesperrt.",
    },
  },
];

export function toolNachId(id: string): ExternesTool | undefined {
  return externeTools.find((t) => t.id === id);
}
