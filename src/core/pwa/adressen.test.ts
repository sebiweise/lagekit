import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALTE_ADRESSE_SKRIPT, ALTE_BEREICHE, aktuellerPfad, neuerPfad } from "./adressen";

const datei = (name: string) => readFileSync(new URL(`../../../${name}`, import.meta.url), "utf8");

describe("Adressen seit /app/", () => {
  it("leitet alte Adressen der App um", () => {
    expect(neuerPfad("/einsatz/")).toBe("/app/einsatz/");
    expect(neuerPfad("/tools/einsatztagebuch/druck/")).toBe("/app/tools/einsatztagebuch/druck/");
    expect(neuerPfad("/hinweise")).toBe("/app/hinweise");
  });

  it("lässt neue und fremde Adressen in Ruhe", () => {
    expect(neuerPfad("/")).toBeNull();
    expect(neuerPfad("/app/einsatz/")).toBeNull();
    expect(neuerPfad("/docs/betrieb/docker/")).toBeNull();
    expect(neuerPfad("/einsatzleitung/")).toBeNull();
    expect(aktuellerPfad("/docs/")).toBe("/docs/");
  });

  it("Skript der 404-Seite nutzt dieselbe Regel", () => {
    const regel = /if\((\/.+\/)\.test\(p\)\)/.exec(ALTE_ADRESSE_SKRIPT)?.[1];
    expect(regel).toBeDefined();
    const ausSkript = new RegExp(regel!.slice(1, -1));
    for (const b of ALTE_BEREICHE) expect(ausSkript.test(`/${b}/`)).toBe(true);
    expect(ausSkript.test("/app/einsatz/")).toBe(false);
  });

  it("Weiterleitungen der Hoster decken alle alten Bereiche ab", () => {
    const vercel = JSON.stringify(JSON.parse(datei("vercel.json")).redirects);
    const nginx = datei("docker/nginx.conf");
    const redirects = datei("public/_redirects");
    for (const b of ALTE_BEREICHE) {
      expect(vercel).toMatch(new RegExp(`[(|]${b}[|)]`));
      expect(nginx).toMatch(new RegExp(`[(|]${b}[|)]`));
      expect(redirects).toContain(`/${b}/* /app/${b}/:splat 301`);
    }
  });
});
