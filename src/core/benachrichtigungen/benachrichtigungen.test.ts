import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { aktivenEinsatzSetzen, einsatzAnlegen } from "@/core/einsatz/repository";
import { aenderungenAnwenden } from "@/core/sync/daten";
import type { Sitzung } from "@/core/sync/sitzung";
import { eintragHinzufuegen } from "@/tools/einsatztagebuch/repository";
import type { Eintrag } from "@/tools/einsatztagebuch/schema";
import { SAMMEL_WARTEZEIT_MS, sitzungMeldungen, standLesen, TagebuchAbgleich, tagebuchBeobachten } from "./quellen";
import { dateienMeldung, SAMMEL_AB, tagebuchMeldung } from "./texte";
import {
  _zuruecksetzen,
  alleGelesen,
  anzeigeSetzen,
  benachrichtigen,
  benachrichtigungen,
  einstellungenSetzen,
  MAX_VERLAUF,
  type BenachrichtigungEingabe,
} from "./verlauf";

function eintrag(nr: number, teil: Partial<Eintrag> = {}): Eintrag {
  return {
    id: crypto.randomUUID(),
    einsatzId: "e",
    nr,
    zeitpunkt: "2026-11-15T10:00:00.000Z",
    erfasstAm: "2026-11-15T10:00:00.000Z",
    art: "Meldung",
    von: "",
    an: "",
    inhalt: `Inhalt ${nr}`,
    verfasser: "",
    korrigiertEintragId: null,
    ...teil,
  };
}

describe("Verlauf", () => {
  beforeEach(_zuruecksetzen);

  it("sammelt neue Meldungen oben, zählt ungelesene und begrenzt die Länge", () => {
    for (let i = 0; i < MAX_VERLAUF + 5; i++) benachrichtigen({ art: "dateien", titel: `Nr ${i}` });
    const v = benachrichtigungen.verlauf();
    expect(v).toHaveLength(MAX_VERLAUF);
    expect(v[0].titel).toBe(`Nr ${MAX_VERLAUF + 4}`);
    expect(v.every((b) => !b.gelesen)).toBe(true);
    alleGelesen();
    expect(benachrichtigungen.verlauf().every((b) => b.gelesen)).toBe(true);
  });

  it("ersetzt Meldungen mit gleicher Kennung", () => {
    benachrichtigen({ art: "update", titel: "A", kennung: "update:1" });
    benachrichtigen({ art: "update", titel: "B", kennung: "update:1" });
    expect(benachrichtigungen.verlauf().map((b) => b.titel)).toEqual(["B"]);
  });

  it("blendet nur ein, wenn es eingeschaltet ist; der Verlauf füllt sich trotzdem", () => {
    const gezeigt: string[] = [];
    anzeigeSetzen((b) => gezeigt.push(b.titel));
    benachrichtigen({ art: "sitzung", titel: "eins" });
    einstellungenSetzen({ einblenden: false });
    benachrichtigen({ art: "sitzung", titel: "zwei" });
    expect(gezeigt).toEqual(["eins"]);
    expect(benachrichtigungen.verlauf()).toHaveLength(2);
  });
});

describe("Texte", () => {
  it("einzelner Eintrag mit Nummer, Art, von/an und gekürztem Inhalt", () => {
    const m = tagebuchMeldung([eintrag(7, { von: "ELW", an: "HLF", inhalt: "x".repeat(300) })])!;
    expect(m.titel).toBe("Tagebuch Nr. 7: Meldung von ELW an HLF");
    expect(m.text!.length).toBeLessThanOrEqual(140);
    expect(m.href).toBe("/app/tools/einsatztagebuch/");
  });

  it("viele Einträge auf einmal als Sammelmeldung", () => {
    const liste = Array.from({ length: SAMMEL_AB + 2 }, (_, i) => eintrag(i + 3));
    expect(tagebuchMeldung(liste)).toMatchObject({ titel: "6 neue Einträge im Tagebuch", text: "Nr. 3 bis 8" });
    expect(tagebuchMeldung([])).toBeNull();
  });

  it("Dateien je Ordner, ohne Meldung bei null", () => {
    expect(dateienMeldung([{ name: "Drohne", anzahl: 0 }])).toBeNull();
    expect(
      dateienMeldung([
        { name: "Drohne", anzahl: 2 },
        { name: "Fotos", anzahl: 1 },
      ]),
    ).toMatchObject({ titel: "3 neue Dateien", text: "2 in „Drohne“, 1 in „Fotos“" });
  });
});

describe("TagebuchAbgleich", () => {
  it("meldet beim ersten Stand und beim Einsatzwechsel nichts", () => {
    const a = new TagebuchAbgleich();
    const e1 = eintrag(1);
    expect(a.neue("e", [e1])).toEqual([]);
    const e2 = eintrag(2);
    expect(a.neue("e", [e1, e2])).toEqual([e2]);
    expect(a.neue("e", [e1, e2])).toEqual([]);
    expect(a.neue("f", [eintrag(1)])).toEqual([]);
  });
});

describe("Tagebuch beobachten", () => {
  const offen: LagekitDB[] = [];
  afterEach(async () => {
    await Promise.all(offen.splice(0).map((db) => db.delete()));
  });

  it("meldet Einträge von anderen Geräten, aber keine eigenen", async () => {
    const db = new LagekitDB(`test-${crypto.randomUUID()}`);
    offen.push(db);
    const einsatz = await einsatzAnlegen(db, { stichwort: "Übung" });
    await aktivenEinsatzSetzen(db, einsatz.id);
    await eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Notiz", inhalt: "vorher" });

    const gemeldet: BenachrichtigungEingabe[] = [];
    const stopp = tagebuchBeobachten(db, (m) => gemeldet.push(m));
    const warten = () => new Promise((r) => setTimeout(r, SAMMEL_WARTEZEIT_MS + 150));
    await warten();

    await eintragHinzufuegen(db, { einsatzId: einsatz.id, art: "Befehl", inhalt: "eigener" });
    await warten();
    expect(gemeldet).toEqual([]);

    const fremd = eintrag(3, { einsatzId: einsatz.id, inhalt: "vom anderen Gerät", von: "HLF" });
    await aenderungenAnwenden(db, einsatz.id, [{ art: "put", tabelle: "tagebuchEintraege", zeile: fremd }]);
    await warten();
    stopp();
    expect(gemeldet).toHaveLength(1);
    expect(gemeldet[0]).toMatchObject({ art: "tagebuch", titel: "Tagebuch Nr. 3: Meldung von HLF" });
  });
});

describe("Sitzung", () => {
  const ich = { geraetId: "x", name: "", funktion: "", fahrzeug: "", geraet: "iPhone · Safari" };

  it("Host: Gerät verbunden und getrennt", () => {
    const host = { rolle: "host", verbunden: [] as unknown[] } as unknown as Sitzung & { verbunden: unknown[] };
    const vorher = standLesen(host);
    host.verbunden = [{ anfrageId: "a", teilnehmer: { ...ich, name: "Meier", fahrzeug: "HLF" } }];
    const mitte = standLesen(host, vorher);
    expect(sitzungMeldungen(vorher, mitte)).toMatchObject([{ titel: "Gerät verbunden", text: "Meier (HLF)" }]);
    host.verbunden = [];
    expect(sitzungMeldungen(mitte, standLesen(host, mitte))).toMatchObject([{ titel: "Gerät getrennt" }]);
  });

  it("Gast: Verbindung verloren ist wichtig, Neuverbinden mit neuem Objekt heißt „Wieder verbunden“", () => {
    const gast = { rolle: "gast", status: "verbunden", meldung: null } as unknown as Sitzung & { status: string };
    const verbunden = standLesen(gast);
    gast.status = "getrennt";
    const getrennt = standLesen(gast, verbunden);
    expect(sitzungMeldungen(verbunden, getrennt)).toMatchObject([{ titel: "Verbindung zum Host verloren", wichtig: true }]);
    const neu = { rolle: "gast", status: "verbindet", meldung: null } as unknown as Sitzung & { status: string };
    const verbindet = standLesen(neu, getrennt);
    expect(sitzungMeldungen(getrennt, verbindet)).toEqual([]);
    neu.status = "verbunden";
    expect(sitzungMeldungen(verbindet, standLesen(neu, verbindet))).toMatchObject([{ titel: "Wieder verbunden" }]);
  });
});
