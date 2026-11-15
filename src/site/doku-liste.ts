/**
 * Inhalt und Reihenfolge der Dokumentation unter `/docs/`. Die Seiten entstehen beim
 * Build aus den Markdown-Dateien unter `docs/` (siehe doku.ts).
 */

export interface DokuEintrag {
  /** Pfad unter `docs/` ohne `.md`, zugleich Adresse unter `/docs/`. */
  pfad: string;
  /** Kurzer Name für Navigation und Übersicht. */
  name: string;
  beschreibung: string;
}

export interface DokuGruppe {
  id: string;
  titel: string;
  eintraege: DokuEintrag[];
}

/** Reihenfolge und Gruppen der Navigation. Neue Dateien unter `docs/` hier eintragen. */
export const DOKU: DokuGruppe[] = [
  {
    id: "betrieb",
    titel: "Selbst betreiben",
    eintraege: [
      { pfad: "betrieb/selbst-betreiben", name: "Überblick", beschreibung: "Welche Variante passt, was jede Installation braucht" },
      { pfad: "betrieb/docker", name: "Docker", beschreibung: "Fertiges Image mit nginx, mit Docker Compose und Reverse-Proxy" },
      { pfad: "betrieb/statisch", name: "Statisches Hosting", beschreibung: "ZIP auf nginx, Apache, Caddy oder einen anderen Webserver" },
      { pfad: "betrieb/vercel", name: "Vercel", beschreibung: "Eigenes Projekt aus dem Repository, mit Kurzcode-Dienst" },
      { pfad: "betrieb/cloudflare-pages", name: "Cloudflare Pages", beschreibung: "Aus dem Repository bauen oder das ZIP hochladen" },
      { pfad: "betrieb/kurzcode", name: "Kurzcode-Dienst", beschreibung: "Vermittlung für „Gemeinsam arbeiten“ ein- oder ausschalten" },
    ],
  },
  {
    id: "bedienung",
    titel: "Bedienung",
    eintraege: [
      { pfad: "konzept/bedienung-im-einsatz", name: "Bedienung im Einsatz", beschreibung: "Grundsätze der Oberfläche und Arbeitsbereich" },
      { pfad: "konzept/gemeinsam-arbeiten", name: "Gemeinsam arbeiten", beschreibung: "Mehrere Geräte am selben Einsatz" },
      { pfad: "konzept/export-druck-mail", name: "Export, Druck und Mail", beschreibung: "ZIP, Einsatzbericht, Mail und verknüpfte Ordner" },
    ],
  },
  {
    id: "fachlich",
    titel: "Fachliche Grundlagen",
    eintraege: [
      { pfad: "fachlich/strahlenexposition", name: "Strahlenexposition", beschreibung: "Rechnung, Richtwerte, Grenzen und Quellen" },
      { pfad: "fachlich/karte-und-standort", name: "Karte und Standort", beschreibung: "Standort, Karte und Nutzungsregeln von OpenStreetMap" },
      { pfad: "fachlich/externe-tools", name: "Externe Tools", beschreibung: "Geprüfte Links und Suchen außerhalb von Lagekit" },
    ],
  },
  {
    id: "technik",
    titel: "Technik",
    eintraege: [{ pfad: "architektur", name: "Architektur", beschreibung: "Leitprinzipien, Technik, Tool-Module, Risiken" }],
  },
];

export const ALLE_DOKUS = DOKU.flatMap((g) => g.eintraege);

export function dokuHref(pfad: string): string {
  return `/docs/${pfad}/`;
}
