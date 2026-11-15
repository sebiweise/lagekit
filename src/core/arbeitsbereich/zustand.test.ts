import { describe, expect, it } from "vitest";
import {
  aufteilen,
  bereinigen,
  geometrie,
  LEER,
  leeren,
  platzieren,
  schliessen,
  sichtbareFelder,
  tauschen,
  zeigen,
} from "./zustand";

describe("Arbeitsbereich", () => {
  it("öffnet Tabs und zeigt sie im ersten Feld", () => {
    let z = zeigen(LEER, "karte");
    z = zeigen(z, "einsatztagebuch");
    expect(z.offen).toEqual(["karte", "einsatztagebuch"]);
    expect(sichtbareFelder(z)).toEqual(["einsatztagebuch"]);
  });

  it("füllt neue Felder beim Aufteilen mit offenen Tabs", () => {
    let z = zeigen(zeigen(zeigen(LEER, "a"), "b"), "c");
    z = aufteilen(z, "zwei");
    expect(sichtbareFelder(z)).toEqual(["c", "a"]);
    expect(z.fokus).toBe(0);
    z = aufteilen(z, "vier");
    expect(sichtbareFelder(z)).toEqual(["c", "a", "b", null]);
    expect(z.fokus).toBe(3);
    // Zurück auf eins und wieder auf vier: nichts geht verloren.
    z = aufteilen(aufteilen(z, "eins"), "vier");
    expect(sichtbareFelder(z)).toEqual(["c", "a", "b", null]);
  });

  it("zeigt Tabs im Feld mit Fokus und tauscht statt doppelt zu zeigen", () => {
    let z = aufteilen(zeigen(zeigen(LEER, "karte"), "einsatztagebuch"), "zwei");
    expect(sichtbareFelder(z)).toEqual(["einsatztagebuch", "karte"]);
    z = zeigen({ ...z, fokus: 1 }, "einsatztagebuch");
    expect(sichtbareFelder(z)).toEqual(["karte", "einsatztagebuch"]);
    z = zeigen(z, "strahlenexposition");
    expect(sichtbareFelder(z)).toEqual(["karte", "strahlenexposition"]);
    expect(z.offen).toHaveLength(3);
  });

  it("setzt Tools per Ziehen in ein Feld, tauscht und leert Felder", () => {
    let z = aufteilen(zeigen(zeigen(zeigen(LEER, "a"), "b"), "c"), "drei");
    expect(sichtbareFelder(z)).toEqual(["c", "a", "b"]);
    z = platzieren(z, 2, "c");
    expect(sichtbareFelder(z)).toEqual(["b", "a", "c"]);
    expect(z.fokus).toBe(2);
    z = tauschen(z, 0, 1);
    expect(sichtbareFelder(z)).toEqual(["a", "b", "c"]);
    z = leeren(z, 1);
    expect(sichtbareFelder(z)).toEqual(["a", null, "c"]);
    expect(z.offen).toEqual(["a", "b", "c"]);
    z = platzieren(z, 1, "neu");
    expect(sichtbareFelder(z)).toEqual(["a", "neu", "c"]);
    expect(z.offen).toEqual(["a", "b", "c", "neu"]);
  });

  it("schließt Tabs und füllt die Lücke", () => {
    let z = aufteilen(zeigen(zeigen(zeigen(LEER, "a"), "b"), "c"), "zwei");
    expect(sichtbareFelder(z)).toEqual(["c", "a"]);
    z = schliessen(z, "c");
    expect(sichtbareFelder(z)).toEqual(["b", "a"]);
    z = schliessen(z, "b");
    expect(sichtbareFelder(z)).toEqual(["a", null]);
    z = schliessen(z, "a");
    expect(z.offen).toEqual([]);
    expect(z.felder).toEqual([null, null, null, null]);
  });

  it("berechnet Felder und Trenner aus den gespeicherten Anteilen", () => {
    const z = { ...LEER, aufteilung: "drei" as const, spalte: 0.6, zeilen: [0.5, 0.3] as [number, number] };
    const { felder, trenner } = geometrie(z);
    expect(felder).toEqual([
      { x: 0, y: 0, b: 0.6, h: 1 },
      { x: 0.6, y: 0, b: 0.4, h: 0.3 },
      { x: 0.6, y: 0.3, b: 0.4, h: 0.7 },
    ]);
    expect(trenner).toEqual([
      { art: "spalte", x: 0.6 },
      { art: "zeile", spalte: 1, x: 0.6, b: 0.4, y: 0.3 },
    ]);
    expect(geometrie(LEER)).toEqual({ felder: [{ x: 0, y: 0, b: 1, h: 1 }], trenner: [] });
  });

  it("verwirft Unbekanntes aus dem Speicher und begrenzt die Größen", () => {
    expect(
      bereinigen(
        { offen: ["karte", "weg", "karte", "tagebuch"], aufteilung: "vier", felder: ["weg", "karte", "karte"], fokus: 9, spalte: 0.99, zeilen: ["x", 0.3] },
        ["karte", "tagebuch"],
      ),
    ).toEqual({
      offen: ["karte", "tagebuch"],
      aufteilung: "vier",
      felder: ["tagebuch", "karte", null, null],
      fokus: 0,
      spalte: 0.8,
      zeilen: [0.5, 0.3],
    });
    expect(bereinigen("kaputt", [])).toEqual(LEER);
  });

  it("übernimmt das ältere Format mit links und rechts", () => {
    expect(
      bereinigen({ offen: ["karte", "tagebuch"], links: "tagebuch", rechts: "karte", geteilt: true, fokus: "rechts" }, [
        "karte",
        "tagebuch",
      ]),
    ).toMatchObject({ aufteilung: "zwei", felder: ["tagebuch", "karte", null, null], fokus: 1 });
  });
});
