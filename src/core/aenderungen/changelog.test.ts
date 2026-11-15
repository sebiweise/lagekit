import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  abschnittAlsMarkdown,
  changelogLesen,
  releaseEintragen,
  versionErhoehen,
  versionVergleichen,
} from "./changelog";

const BEISPIEL = `# Änderungen

Einleitung der Datei.

## [Unveröffentlicht]

### Neu

- Neues Tool
  mit zweiter Zeile

### Daten

- Einstellungen des Arbeitsbereichs werden zurückgesetzt.

## [0.2.0] - 2026-12-01

Kurzer Text zur Version.

### Behoben

- Fehler A
* Fehler B

### Leer

## [0.1.0] - 2026-11-15

### Neu

- Erste Version
`;

describe("changelogLesen", () => {
  it("liest Abschnitte, Gruppen, Fortsetzungszeilen und Einleitung", () => {
    const abschnitte = changelogLesen(BEISPIEL);
    expect(abschnitte.map((a) => a.version)).toEqual([null, "0.2.0", "0.1.0"]);
    expect(abschnitte[0].gruppen).toEqual([
      { titel: "Neu", punkte: ["Neues Tool mit zweiter Zeile"] },
      { titel: "Daten", punkte: ["Einstellungen des Arbeitsbereichs werden zurückgesetzt."] },
    ]);
    expect(abschnitte[1]).toMatchObject({
      datum: "2026-12-01",
      einleitung: "Kurzer Text zur Version.",
      gruppen: [{ titel: "Behoben", punkte: ["Fehler A", "Fehler B"] }],
    });
  });

  it("lehnt ungültige Versionen ab", () => {
    expect(() => changelogLesen("## [1.0] - 2026-01-01\n")).toThrow(/Ungültige Version/);
  });

  it("liest die CHANGELOG.md des Repos", () => {
    const abschnitte = changelogLesen(readFileSync("CHANGELOG.md", "utf8"));
    expect(abschnitte[0].version).toBeNull();
    const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;
    expect(abschnitte.some((a) => a.version === version)).toBe(true);
  });
});

describe("Versionen", () => {
  it("vergleicht nach SemVer", () => {
    expect(versionVergleichen("0.10.0", "0.9.9")).toBeGreaterThan(0);
    expect(versionVergleichen("1.0.0", "1.0.0")).toBe(0);
    expect(versionVergleichen("0.1.0", "0.1.1")).toBeLessThan(0);
  });

  it("erhöht je nach Art", () => {
    expect(versionErhoehen("0.1.3", "patch")).toBe("0.1.4");
    expect(versionErhoehen("0.1.3", "minor")).toBe("0.2.0");
    expect(versionErhoehen("0.1.3", "major")).toBe("1.0.0");
  });
});

describe("releaseEintragen", () => {
  it("macht aus Unveröffentlicht die neue Version", () => {
    const neu = changelogLesen(releaseEintragen(BEISPIEL, "0.3.0", "2027-01-02"));
    expect(neu[0]).toMatchObject({ version: null, gruppen: [] });
    expect(neu[1]).toMatchObject({ version: "0.3.0", datum: "2027-01-02" });
    expect(neu[1].gruppen.map((g) => g.titel)).toEqual(["Neu", "Daten"]);
  });

  it("liefert Markdown für das GitHub-Release", () => {
    expect(abschnittAlsMarkdown(changelogLesen(BEISPIEL)[1])).toBe(
      "Kurzer Text zur Version.\n\n### Behoben\n\n- Fehler A\n- Fehler B",
    );
  });
});
