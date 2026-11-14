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
  hinweise: {
    link: "Hinweise, Haftung und Datenschutz",
    titel: "Hinweise",
    haftungTitel: "Haftungshinweis",
    haftung:
      "Lagekit ist ein Hilfsmittel zur Dokumentation und Berechnung. Es ersetzt weder Messgeräte wie Dosimeter noch die Verantwortung der Einsatzleitung. Alle Ergebnisse sind vor einer Entscheidung zu prüfen. Die Nutzung erfolgt ohne Gewähr.",
    datenTitel: "Daten und Datenschutz",
    daten:
      "Alle Eingaben werden ausschließlich im Browser dieses Geräts gespeichert. Es gibt kein Konto, keinen Server und kein Tracking. Für Exporte und deren Weitergabe ist die nutzende Einheit verantwortlich.",
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
