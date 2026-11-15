import {
  DATEN_GRUPPE,
  versionVergleichen,
  type ChangelogAbschnitt,
  type ChangelogGruppe,
} from "./changelog";

/**
 * Was ein Build über sich weiß. Die laufende App hat ihre eigene Angabe,
 * ein wartender Service Worker liefert die der neuen Version (siehe sw.ts).
 */
export interface VersionInfo {
  version: string;
  commit: string;
  schemaVersion: number;
  migrationen: { version: number; beschreibung: string }[];
  changelog: ChangelogAbschnitt[];
}

/** Nachricht an den wartenden Service Worker; Antwort kommt über den MessagePort. */
export const VERSION_INFO_ANFRAGE = "VERSION_INFO";

export interface UpdateUebersicht {
  /** Abschnitte, die neu hinzukommen; „Unveröffentlicht“ nur mit neuen Punkten. */
  abschnitte: ChangelogAbschnitt[];
  /** Datenbank-Umbauten, die beim ersten Start der neuen Version laufen. */
  migrationen: VersionInfo["migrationen"];
  /** Punkte der Gruppe „Daten“ aus den neuen Abschnitten. */
  datenHinweise: string[];
  /** Die neue Version ist älter als die installierte (Rückkehr zu einem älteren Stand). */
  aeltereVersion: boolean;
  /** Die neue Datenbank ist älter: Die alte App könnte die Daten nicht mehr öffnen. */
  schemaRueckschritt: boolean;
}

function neuePunkte(gruppen: ChangelogGruppe[], bekannt: Set<string>): ChangelogGruppe[] {
  return gruppen
    .map((g) => ({ ...g, punkte: g.punkte.filter((p) => !bekannt.has(`${g.titel}\u0000${p}`)) }))
    .filter((g) => g.punkte.length > 0);
}

/** Vergleicht die installierte mit der wartenden Version. */
export function updateUebersicht(aktuell: VersionInfo, neu: VersionInfo): UpdateUebersicht {
  const abschnitte: ChangelogAbschnitt[] = [];
  const bekannteVersionen = new Set(
    aktuell.changelog.flatMap((a) => (a.version ? [a.version] : [])),
  );
  // Punkte, die schon in der installierten App standen, gleich ob veröffentlicht oder nicht.
  const bekanntePunkte = new Set(
    aktuell.changelog.flatMap((a) => a.gruppen.flatMap((g) => g.punkte.map((p) => `${g.titel}\u0000${p}`))),
  );

  for (const abschnitt of neu.changelog) {
    if (abschnitt.version === null) {
      const gruppen = neuePunkte(abschnitt.gruppen, bekanntePunkte);
      if (gruppen.length > 0) abschnitte.push({ ...abschnitt, gruppen });
    } else if (!bekannteVersionen.has(abschnitt.version)) {
      // Punkte, die vorher unter „Unveröffentlicht“ standen, gelten als bekannt.
      const gruppen = neuePunkte(abschnitt.gruppen, bekanntePunkte);
      if (gruppen.length > 0 || versionVergleichen(abschnitt.version, aktuell.version) > 0) {
        abschnitte.push({ ...abschnitt, gruppen });
      }
    }
  }

  return {
    abschnitte,
    migrationen: neu.migrationen.filter((m) => m.version > aktuell.schemaVersion),
    datenHinweise: abschnitte.flatMap((a) =>
      a.gruppen.filter((g) => g.titel === DATEN_GRUPPE).flatMap((g) => g.punkte),
    ),
    aeltereVersion: versionVergleichen(neu.version, aktuell.version) < 0,
    schemaRueckschritt: neu.schemaVersion < aktuell.schemaVersion,
  };
}

/** Prüft grob, ob eine Antwort des Service Workers eine VersionInfo ist. */
export function istVersionInfo(wert: unknown): wert is VersionInfo {
  if (typeof wert !== "object" || wert === null) return false;
  const v = wert as Partial<VersionInfo>;
  return (
    typeof v.version === "string" &&
    typeof v.commit === "string" &&
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.migrationen) &&
    Array.isArray(v.changelog)
  );
}
