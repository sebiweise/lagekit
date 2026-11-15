/**
 * Alle Oberflächentexte. Zum Start nur Deutsch; neue Sprachen kommen als
 * weitere Datei mit derselben Struktur dazu.
 */
export const de = {
  app: {
    name: "Lagekit",
    beschreibung: "Offline-Toolbox für Einsatzkräfte im ELW",
  },
  start: {
    titel: "Lagekit",
    untertitel:
      "Erfassung, Dokumentation und Rechenhilfen für den Einsatzleitwagen. Läuft nach dem ersten Laden ohne Netz, alle Daten bleiben auf diesem Gerät.",
    toolsTitel: "Tools",
    keineTools: "Die ersten Tools (Strahlenexposition, Einsatztagebuch) folgen in den nächsten Versionen.",
  },
  status: {
    titel: "Gerätestatus",
    offlineBereit: "Offline bereit",
    offlineWirdVorbereitet: "Offline-Modus wird vorbereitet …",
    offlineNichtVerfuegbar: "Offline-Modus nicht verfügbar",
    offlineNurProduktion: "Offline-Modus nur im Produktions-Build",
    netzOnline: "Netz verfügbar",
    netzOffline: "Kein Netz",
    speicherGewaehrt: "Dauerhafter Speicher gewährt",
    speicherAbgelehnt: "Dauerhafter Speicher nicht gewährt: Als App installieren und regelmäßig exportieren.",
    speicherNichtUnterstuetzt: "Dauerhafter Speicher wird von diesem Browser nicht unterstützt",
    version: "Version",
    updateVerfuegbar: "Neue Version verfügbar.",
    updateHinweis: "Erst nach dem Einsatz aktualisieren.",
    updateAktivieren: "Jetzt aktualisieren",
    geraetezeit: "Gerätezeit",
  },
  nav: {
    start: "Start",
    einsatz: "Einsatz",
    sitzung: "Gemeinsam",
    suche: "Suche",
    arbeitsbereich: "Arbeitsbereich",
    keinEinsatz: "Kein Einsatz aktiv",
  },
  darstellung: {
    titel: "Darstellung",
    system: "System",
    hell: "Hell",
    dunkel: "Dunkel",
  },
  einsatz: {
    titel: "Einsätze",
    aktiv: "Aktiver Einsatz",
    keinAktiver: "Kein Einsatz aktiv. Legen Sie einen Einsatz an oder wählen Sie einen aus der Liste.",
    zurVerwaltung: "Einsätze verwalten",
    neu: "Neuer Einsatz",
    stichwort: "Stichwort",
    stichwortBeispiel: "z. B. ABC 2, Gefahrstoffaustritt",
    ort: "Ort",
    einheit: "Eigene Einheit",
    beginn: "Beginn",
    ende: "Ende",
    anlegen: "Einsatz anlegen",
    liste: "Alle Einsätze auf diesem Gerät",
    leer: "Noch keine Einsätze auf diesem Gerät.",
    statusAktiv: "läuft",
    statusAbgeschlossen: "abgeschlossen",
    ausgewaehlt: "ausgewählt",
    auswaehlen: "Auswählen",
    abschliessen: "Abschließen",
    wiederOeffnen: "Wieder öffnen",
    exportieren: "Exportieren",
    loeschen: "Löschen",
    loeschenBestaetigen: "Endgültig löschen",
    loeschenFrage: "Einsatz mit allen Daten auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.",
    abbrechen: "Abbrechen",
    abgeschlossenHinweis: "Einsatz abgeschlossen. Sichern Sie die Daten jetzt als Datei, bevor das Gerät wieder in den Alltag geht.",
    jetztSichern: "Jetzt sichern",
  },
  sicherung: {
    titel: "Sicherung und Gerätewechsel",
    text: "Eine Sicherungsdatei (JSON) enthält Einsätze mit allen Tool-Daten. Auf einem anderen Gerät importiert, werden vorhandene Daten ergänzt, nicht gelöscht.",
    allesExportieren: "Alles sichern (JSON)",
    importieren: "Sicherung importieren",
    importErfolg: (neu: number, aktualisiert: number, unveraendert: number, zeilen: number) =>
      `Import abgeschlossen: ${neu} neue, ${aktualisiert} aktualisierte, ${unveraendert} unveränderte Einsätze, ${zeilen} neue Einträge.`,
    importUnbekannt: (tabellen: string) =>
      `Nicht übernommen, weil diese Version die Daten nicht kennt: ${tabellen}. Bitte Lagekit aktualisieren.`,
    importFehler: "Import fehlgeschlagen",
  },
  hinweise: {
    link: "Hinweise, Haftung und Datenschutz",
    titel: "Hinweise",
    haftungTitel: "Haftungshinweis",
    haftung:
      "Lagekit ist ein Hilfsmittel zur Dokumentation und Berechnung. Es ersetzt weder Messgeräte wie Dosimeter noch die Verantwortung der Einsatzleitung. Alle Ergebnisse sind vor einer Entscheidung zu prüfen. Die Nutzung erfolgt ohne Gewähr.",
    datenTitel: "Daten und Datenschutz",
    daten:
      "Alle Eingaben werden ausschließlich im Browser dieses Geräts gespeichert. Es gibt kein Konto, keinen Server und kein Tracking. Für Exporte und deren Weitergabe ist die nutzende Einheit verantwortlich. Ausnahmen, nur bei Internet: Die Karte lädt Kartenbilder von OpenStreetMap, und wer „Standort“ oder die Adresssuche antippt, schickt Koordinaten bzw. Suchbegriff an den Adressdienst von OpenStreetMap (Nominatim). Für „Gemeinsam arbeiten“ per Kurzcode laufen nur Verbindungsdaten kurz über einen Vermittlungsdienst.",
    datenverlustTitel: "Datenverlust vermeiden",
    datenverlust:
      "Browser können lokale Daten löschen, etwa beim Leeren des Verlaufs. Installieren Sie Lagekit als App und exportieren Sie Einsätze regelmäßig.",
    lizenzTitel: "Lizenz",
    lizenz: "Lagekit ist freie Software unter der GNU Affero General Public License v3.0.",
    zurueck: "Zur Startseite",
  },
  nichtGefunden: {
    titel: "Seite nicht gefunden",
    text: "Diese Adresse gibt es in Lagekit nicht.",
  },
} as const;

export type Texte = typeof de;
