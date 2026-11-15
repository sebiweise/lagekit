import { describe, expect, it } from "vitest";
import { Circle } from "lucide-react";
import { befehleFiltern, istPalettenKuerzel, normalisieren, passt, type Befehl } from "./befehle";

const b = (text: string, extra: Partial<Befehl> = {}): Befehl => ({ id: text, text, icon: Circle, ausfuehren: () => {}, ...extra });

describe("normalisieren", () => {
  it("schreibt Umlaute aus", () => {
    expect(normalisieren("Übung Straße Größe")).toBe("uebung strasse groesse");
  });
});

describe("passt", () => {
  it("findet Wörter in beliebiger Reihenfolge", () => {
    expect(passt(b("Tagebuch-Eintrag schreiben"), "ein tag")).toBe(true);
    expect(passt(b("Tagebuch-Eintrag schreiben"), "tag strahl")).toBe(false);
  });
  it("sucht auch in Hinweis und Stichworten", () => {
    expect(passt(b("Bericht drucken", { stichworte: ["PDF"] }), "pdf")).toBe(true);
    expect(passt(b("Wechseln zu B3", { hinweis: "Musterstraße 1" }), "musterstr")).toBe(true);
  });
  it("findet mit und ohne Umlaut", () => {
    expect(passt(b("Änderungen"), "aender")).toBe(true);
    expect(passt(b("Aenderungen"), "änder")).toBe(true);
  });
  it("zeigt Befehle mit `immer` bei jeder Eingabe", () => {
    expect(passt(b("Suchen", { immer: true }), "xyz")).toBe(true);
  });
});

describe("befehleFiltern", () => {
  const gruppen = [
    { titel: "Tools", items: [b("Strahlenexposition"), b("Einsatztagebuch")] },
    { titel: "Einsatz", items: [b("Einsatz anlegen"), b("Tagebuch-Eintrag schreiben")] },
  ];

  it("lässt ohne Eingabe alles stehen", () => {
    expect(befehleFiltern(gruppen, "  ")).toEqual(gruppen);
  });
  it("entfernt leere Gruppen", () => {
    expect(befehleFiltern(gruppen, "strahl").map((g) => g.titel)).toEqual(["Tools"]);
  });
  it("stellt nachrangige Gruppen nur nach vorn, wenn sonst nichts passt", () => {
    const mitSuche = [{ titel: "Suchen", nachrangig: true, items: [b("Suchen", { immer: true })] }, ...gruppen];
    expect(befehleFiltern(mitSuche, "strahl").map((g) => g.titel)).toEqual(["Tools", "Suchen"]);
    expect(befehleFiltern(mitSuche, "1005").map((g) => g.titel)).toEqual(["Suchen"]);
  });
  it("stellt Treffer am Wortanfang nach vorn", () => {
    const g = [{ titel: "x", items: [b("Einsatztagebuch"), b("Tagebuch-Eintrag schreiben")] }];
    expect(befehleFiltern(g, "tagebuch")[0].items.map((i) => i.text)).toEqual(["Tagebuch-Eintrag schreiben", "Einsatztagebuch"]);
  });
});

describe("istPalettenKuerzel", () => {
  const taste = (key: string, mod: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mod,
  });
  it("erkennt Strg+K und ⌘K", () => {
    expect(istPalettenKuerzel(taste("k", { ctrlKey: true }))).toBe(true);
    expect(istPalettenKuerzel(taste("K", { metaKey: true }))).toBe(true);
  });
  it("ignoriert K allein und mit weiteren Tasten", () => {
    expect(istPalettenKuerzel(taste("k"))).toBe(false);
    expect(istPalettenKuerzel(taste("k", { ctrlKey: true, shiftKey: true }))).toBe(false);
  });
});
