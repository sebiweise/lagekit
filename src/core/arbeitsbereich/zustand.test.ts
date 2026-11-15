import { describe, expect, it } from "vitest";
import { bereinigen, LEER, schliessen, teilen, zeigen } from "./zustand";

describe("Arbeitsbereich", () => {
  it("öffnet Tabs und zeigt sie links", () => {
    let z = zeigen(LEER, "karte");
    z = zeigen(z, "einsatztagebuch");
    expect(z.offen).toEqual(["karte", "einsatztagebuch"]);
    expect(z.links).toBe("einsatztagebuch");
  });

  it("teilt die Ansicht und füllt die Seite mit Fokus; tauscht statt doppelt zu zeigen", () => {
    let z = zeigen(zeigen(LEER, "karte"), "einsatztagebuch");
    z = teilen(z, true);
    expect([z.links, z.rechts]).toEqual(["einsatztagebuch", "karte"]);
    z = zeigen({ ...z, fokus: "rechts" }, "einsatztagebuch");
    expect([z.links, z.rechts]).toEqual(["karte", "einsatztagebuch"]);
    z = zeigen({ ...z, fokus: "rechts" }, "strahlenexposition");
    expect([z.links, z.rechts]).toEqual(["karte", "strahlenexposition"]);
    expect(z.offen).toHaveLength(3);
  });

  it("schließt Tabs und füllt die Lücke", () => {
    let z = teilen(zeigen(zeigen(zeigen(LEER, "a"), "b"), "c"), true);
    expect([z.links, z.rechts]).toEqual(["c", "a"]);
    z = schliessen(z, "c");
    expect([z.links, z.rechts]).toEqual(["b", "a"]);
    z = schliessen(z, "b");
    expect([z.links, z.rechts]).toEqual(["a", null]);
    z = schliessen(z, "a");
    expect(z).toMatchObject({ offen: [], links: null, rechts: null });
  });

  it("verwirft Unbekanntes aus dem Speicher", () => {
    expect(bereinigen({ offen: ["karte", "weg", "karte"], links: "weg", rechts: "karte", geteilt: true }, ["karte"])).toEqual({
      offen: ["karte"],
      links: "karte",
      rechts: null,
      geteilt: true,
      fokus: "links",
    });
    expect(bereinigen("kaputt", [])).toEqual(LEER);
  });
});
