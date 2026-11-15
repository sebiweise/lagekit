/**
 * Liest CHANGELOG.md und vergleicht Versionen.
 *
 * Reine Funktionen ohne Imports: Die Datei wird auch von Node-Skripten
 * (scripts/build-sw.mjs, scripts/release.mjs) direkt geladen, daher keine
 * Pfad-Aliase und nur Typen-Syntax, die Node entfernen kann.
 */

/** Gruppe, deren Punkte gespeicherte Daten betreffen. */
export const DATEN_GRUPPE = "Daten";

export interface ChangelogGruppe {
  titel: string;
  punkte: string[];
}

export interface ChangelogAbschnitt {
  /** `null` für den Abschnitt „Unveröffentlicht“. */
  version: string | null;
  datum: string | null;
  /** Freier Text unter der Überschrift, vor der ersten Gruppe. */
  einleitung: string | null;
  gruppen: ChangelogGruppe[];
}

const VERSION_ZEILE = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/;
const GRUPPE_ZEILE = /^###\s+(.+?)\s*$/;
const PUNKT_ZEILE = /^\s*[-*]\s+(.+)$/;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function istUnveroeffentlicht(name: string): boolean {
  return /^(unver(ö|oe)ffentlicht|unreleased)$/i.test(name.trim());
}

/** Zerlegt den Markdown-Text in Abschnitte, neueste zuerst wie in der Datei. */
export function changelogLesen(text: string): ChangelogAbschnitt[] {
  const abschnitte: ChangelogAbschnitt[] = [];
  let abschnitt: ChangelogAbschnitt | null = null;
  let gruppe: ChangelogGruppe | null = null;
  let einleitung: string[] = [];

  const einleitungAbschliessen = () => {
    if (abschnitt && einleitung.length > 0) {
      const text = einleitung.join(" ").trim();
      abschnitt.einleitung = text || null;
    }
    einleitung = [];
  };

  for (const zeile of text.split(/\r?\n/)) {
    const version = VERSION_ZEILE.exec(zeile);
    if (version) {
      einleitungAbschliessen();
      const name = version[1].trim();
      if (!istUnveroeffentlicht(name) && !SEMVER.test(name)) {
        throw new Error(`CHANGELOG.md: Ungültige Version „${name}“ (erwartet z. B. 1.2.3).`);
      }
      abschnitt = {
        version: istUnveroeffentlicht(name) ? null : name,
        datum: version[2] ?? null,
        einleitung: null,
        gruppen: [],
      };
      abschnitte.push(abschnitt);
      gruppe = null;
      continue;
    }
    if (!abschnitt) continue;

    const titel = GRUPPE_ZEILE.exec(zeile);
    if (titel) {
      einleitungAbschliessen();
      gruppe = { titel: titel[1], punkte: [] };
      abschnitt.gruppen.push(gruppe);
      continue;
    }

    const punkt = PUNKT_ZEILE.exec(zeile);
    if (punkt && gruppe) {
      gruppe.punkte.push(punkt[1].trim());
    } else if (gruppe && gruppe.punkte.length > 0 && /^\s{2,}\S/.test(zeile)) {
      // Fortsetzungszeile eines Punkts.
      gruppe.punkte[gruppe.punkte.length - 1] += ` ${zeile.trim()}`;
    } else if (!gruppe && zeile.trim()) {
      einleitung.push(zeile.trim());
    }
  }
  einleitungAbschliessen();

  for (const a of abschnitte) a.gruppen = a.gruppen.filter((g) => g.punkte.length > 0);
  return abschnitte;
}

/** Vergleicht zwei Versionen nach SemVer; ungültige gelten als 0.0.0. */
export function versionVergleichen(a: string, b: string): number {
  const teile = (v: string) => (SEMVER.exec(v) ?? [v, "0", "0", "0"]).slice(1, 4).map(Number);
  const [x, y] = [teile(a), teile(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

export type ReleaseArt = "patch" | "minor" | "major";

export function versionErhoehen(version: string, art: ReleaseArt): string {
  const teile = SEMVER.exec(version);
  if (!teile) throw new Error(`Ungültige Version „${version}“.`);
  const [major, minor, patch] = teile.slice(1, 4).map(Number);
  if (art === "major") return `${major + 1}.0.0`;
  if (art === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function istLeer(abschnitt: ChangelogAbschnitt | undefined): boolean {
  return !abschnitt || abschnitt.gruppen.every((g) => g.punkte.length === 0);
}

/**
 * Macht aus „Unveröffentlicht“ den Abschnitt der neuen Version und legt
 * darüber einen leeren Abschnitt „Unveröffentlicht“ an.
 */
export function releaseEintragen(text: string, version: string, datum: string): string {
  const zeilen = text.split("\n");
  const index = zeilen.findIndex((z) => {
    const treffer = VERSION_ZEILE.exec(z);
    return treffer !== null && istUnveroeffentlicht(treffer[1]);
  });
  if (index === -1) throw new Error("CHANGELOG.md: Abschnitt „## [Unveröffentlicht]“ fehlt.");
  zeilen.splice(index, 1, "## [Unveröffentlicht]", "", `## [${version}] - ${datum}`);
  return zeilen.join("\n");
}

/** Markdown eines Abschnitts für die Beschreibung des GitHub-Releases. */
export function abschnittAlsMarkdown(abschnitt: ChangelogAbschnitt): string {
  const teile: string[] = [];
  if (abschnitt.einleitung) teile.push(abschnitt.einleitung);
  for (const gruppe of abschnitt.gruppen) {
    teile.push(`### ${gruppe.titel}\n\n${gruppe.punkte.map((p) => `- ${p}`).join("\n")}`);
  }
  return teile.join("\n\n");
}
