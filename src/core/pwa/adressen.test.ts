import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALTE_ADRESSE_SKRIPT, ALTE_BEREICHE, aktuellerPfad, basisPfadAus, mitBasis, neuerPfad } from "./adressen";

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

describe("Basispfad (BASE_PATH)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("normalisiert den Wert beim Build", () => {
    expect(basisPfadAus(undefined)).toBe("");
    expect(basisPfadAus("")).toBe("");
    expect(basisPfadAus("/")).toBe("");
    expect(basisPfadAus("/lagekit")).toBe("/lagekit");
    expect(basisPfadAus(" /lagekit/ ")).toBe("/lagekit");
    expect(basisPfadAus("/a/b.c")).toBe("/a/b.c");
  });

  it("lehnt Werte ab, die kein einfacher Pfad sind", () => {
    for (const wert of ["lagekit", "/lagekit//", "//lagekit", "/a//b", "/../x", "/a b", "https://x.de/lagekit"]) {
      expect(() => basisPfadAus(wert), wert).toThrow(/BASE_PATH/);
    }
  });

  it("ohne Basispfad bleibt jeder Pfad, wie er ist", () => {
    expect(mitBasis("/sw.js")).toBe("/sw.js");
    expect(mitBasis("https://example.org/")).toBe("https://example.org/");
  });

  async function mitLagekit() {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/lagekit");
    vi.resetModules();
    return import("./adressen");
  }

  /** Führt ein Skript mit nachgebautem `location` aus und liefert das Ziel von `location.replace`. */
  function ausfuehren(skript: string, pfad: string, suche = "") {
    let ziel: string | null = null;
    const location = { pathname: pfad, search: suche, hash: "", replace: (u: string) => (ziel = u) };
    const document = { documentElement: { dataset: {} } };
    new Function("location", "document", skript)(location, document);
    return ziel;
  }

  it("setzt ihn vor Pfade ab der Wurzel", async () => {
    const a = await mitLagekit();
    expect(a.BASIS_PFAD).toBe("/lagekit");
    expect(a.mitBasis("/sw.js")).toBe("/lagekit/sw.js");
    expect(a.mitBasis("/")).toBe("/lagekit/");
    expect(a.mitBasis("//cdn.example.org/x")).toBe("//cdn.example.org/x");
    expect(a.mitBasis("#anker")).toBe("#anker");
  });

  it("404-Skript leitet alte Adressen im Unterordner weiter", async () => {
    const a = await mitLagekit();
    expect(ausfuehren(a.ALTE_ADRESSE_SKRIPT, "/lagekit/einsatz/", "?x=1")).toBe("/lagekit/app/einsatz/?x=1");
    expect(ausfuehren(a.ALTE_ADRESSE_SKRIPT, "/lagekit/tools/einsatztagebuch/")).toBe("/lagekit/app/tools/einsatztagebuch/");
    expect(ausfuehren(a.ALTE_ADRESSE_SKRIPT, "/lagekit/app/einsatz/")).toBeNull();
    expect(ausfuehren(a.ALTE_ADRESSE_SKRIPT, "/lagekit/gibtesnicht/")).toBeNull();
  });

  it("404-Skript an der Wurzel wie bisher", () => {
    expect(ausfuehren(ALTE_ADRESSE_SKRIPT, "/einsatz/")).toBe("/app/einsatz/");
    expect(ausfuehren(ALTE_ADRESSE_SKRIPT, "/docs/")).toBeNull();
  });
});
