import { describe, expect, it } from "vitest";
import { changelogLesen } from "./changelog";
import { istVersionInfo, updateUebersicht, type VersionInfo } from "./version-info";

const migrationen = [1, 2, 3, 4, 5, 6].map((version) => ({ version, beschreibung: `Umbau ${version}` }));

function info(version: string, schemaVersion: number, changelog: string): VersionInfo {
  return {
    version,
    commit: "abc1234",
    schemaVersion,
    migrationen: migrationen.filter((m) => m.version <= schemaVersion),
    changelog: changelogLesen(changelog),
  };
}

const ALT = info(
  "0.1.0",
  5,
  `## [Unveröffentlicht]

### Neu

- Schon installiert

## [0.1.0] - 2026-11-15

### Neu

- Erste Version
`,
);

describe("updateUebersicht", () => {
  it("zeigt neue Versionen und Datenbank-Umbauten", () => {
    const neu = info(
      "0.2.0",
      6,
      `## [Unveröffentlicht]

## [0.2.0] - 2026-12-01

### Neu

- Schon installiert
- Neues Tool

### Daten

- Arbeitsbereich wird zurückgesetzt.

## [0.1.0] - 2026-11-15

### Neu

- Erste Version
`,
    );
    const u = updateUebersicht(ALT, neu);
    expect(u.abschnitte).toHaveLength(1);
    expect(u.abschnitte[0].version).toBe("0.2.0");
    // „Schon installiert“ stand vorher unter Unveröffentlicht und wird nicht wiederholt.
    expect(u.abschnitte[0].gruppen).toEqual([
      { titel: "Neu", punkte: ["Neues Tool"] },
      { titel: "Daten", punkte: ["Arbeitsbereich wird zurückgesetzt."] },
    ]);
    expect(u.migrationen).toEqual([{ version: 6, beschreibung: "Umbau 6" }]);
    expect(u.datenHinweise).toEqual(["Arbeitsbereich wird zurückgesetzt."]);
    expect(u).toMatchObject({ aeltereVersion: false, schemaRueckschritt: false });
  });

  it("zeigt bei unveröffentlichten Ständen nur neue Punkte", () => {
    const neu = info(
      "0.1.0",
      5,
      `## [Unveröffentlicht]

### Neu

- Schon installiert

### Behoben

- Neuer Fehler behoben

## [0.1.0] - 2026-11-15

### Neu

- Erste Version
`,
    );
    const u = updateUebersicht(ALT, neu);
    expect(u.abschnitte).toEqual([
      expect.objectContaining({ version: null, gruppen: [{ titel: "Behoben", punkte: ["Neuer Fehler behoben"] }] }),
    ]);
    expect(u.migrationen).toEqual([]);
  });

  it("erkennt eine ältere Version mit älterer Datenbank", () => {
    const u = updateUebersicht(ALT, info("0.0.9", 4, "## [0.0.9] - 2026-10-01\n"));
    expect(u).toMatchObject({ aeltereVersion: true, schemaRueckschritt: true, abschnitte: [] });
  });
});

describe("istVersionInfo", () => {
  it("prüft die Antwort des Service Workers", () => {
    expect(istVersionInfo(ALT)).toBe(true);
    expect(istVersionInfo({ version: "1.0.0" })).toBe(false);
    expect(istVersionInfo(null)).toBe(false);
  });
});
