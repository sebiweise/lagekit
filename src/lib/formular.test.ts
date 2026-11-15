import { describe, expect, it } from "vitest";
import { z } from "zod";
import { einsatzBearbeitenFormularSchema, einsatzFormularSchema } from "@/core/einsatz/schema";
import { empfaengerSchema } from "@/core/export/mail";
import { sitzungStartFormularSchema } from "@/core/sync/formular";
import { eintragFormularSchema } from "@/tools/einsatztagebuch/formular";
import {
  aufenthaltNachtragenFormularSchema,
  aufenthaltStartFormularSchema,
  richtwerteFormularSchema,
} from "@/tools/strahlenexposition/schema";
import { fehlerText, optionaleZahlText, zahlText } from "./formular";

function meldungen(ergebnis: { success: boolean; error?: z.ZodError }): Record<string, string> {
  return Object.fromEntries((ergebnis.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));
}

describe("Formularbausteine", () => {
  it("liest Zahlen mit Komma und meldet Fehler auf Deutsch", () => {
    expect(zahlText().parse("0,5")).toBe(0.5);
    expect(meldungen(zahlText().safeParse(""))).toEqual({ "": "Bitte einen Wert eingeben." });
    expect(meldungen(zahlText().safeParse("abc"))).toEqual({ "": "Bitte eine Zahl eingeben, z. B. 0,5." });
    expect(optionaleZahlText().parse("  ")).toBeNull();
  });

  it("nutzt deutsche Standardmeldungen", () => {
    expect(z.number().safeParse("x").error?.issues[0].message).toMatch(/^Ungültige Eingabe/);
  });

  it("macht zod-Fehler lesbar", () => {
    const fehler = z.object({ a: z.string().min(1, "A fehlt") }).safeParse({ a: "" }).error;
    expect(fehlerText(fehler)).toBe("A fehlt");
    expect(fehlerText(new Error("kaputt"))).toBe("kaputt");
  });
});

describe("Formularschemas", () => {
  it("Einsatz: Stichwort Pflicht, Beginn beim Anlegen optional, beim Bearbeiten Pflicht", () => {
    const leer = { stichwort: " ", ort: "", einheit: "", koordinaten: null, beginn: "" };
    expect(meldungen(einsatzFormularSchema.safeParse(leer))).toEqual({ stichwort: "Bitte ein Stichwort angeben." });
    expect(einsatzFormularSchema.parse({ ...leer, stichwort: "B3" }).beginn).toBeUndefined();
    expect(meldungen(einsatzBearbeitenFormularSchema.safeParse({ ...leer, stichwort: "B3" }))).toEqual({
      beginn: "Bitte den Beginn angeben.",
    });
    expect(einsatzFormularSchema.parse({ ...leer, stichwort: "B3", beginn: "2026-11-15T10:30" }).beginn).toMatch(/Z$/);
  });

  it("Strahlenexposition: ODL als Zahl, nicht negativ, Ende nicht vor Beginn", () => {
    expect(aufenthaltStartFormularSchema.parse({ ort: "Tank 3", odl: "2,5", odlEinheit: "µSv/h" }).odl).toBe(2.5);
    expect(meldungen(aufenthaltStartFormularSchema.safeParse({ ort: "", odl: "-1", odlEinheit: "µSv/h" }))).toEqual({
      ort: "Bitte den Ort angeben.",
      odl: "ODL darf nicht negativ sein",
    });
    const nachtrag = {
      ort: "Tank 3",
      odl: "1",
      odlEinheit: "mSv/h",
      beginn: "2026-11-15T10:30",
      ende: "2026-11-15T10:00",
      dosimeterMsv: "",
    };
    expect(meldungen(aufenthaltNachtragenFormularSchema.safeParse(nachtrag))).toEqual({ ende: "Ende liegt vor dem Beginn." });
    expect(aufenthaltNachtragenFormularSchema.parse({ ...nachtrag, ende: "2026-11-15T11:00" }).dosimeterMsv).toBeNull();
    expect(meldungen(richtwerteFormularSchema.safeParse({ werte: [{ grenzeMsv: "0" }] }))).toEqual({
      "werte.0.grenzeMsv": "Richtwert muss größer als 0 sein",
    });
  });

  it("Tagebuch: Inhalt Pflicht, Uhrzeit leer oder HH:MM", () => {
    const eintrag = { art: "Meldung", inhalt: "", von: "", an: "", verfasser: "", uhrzeit: "25:00" };
    expect(meldungen(eintragFormularSchema.safeParse(eintrag))).toEqual({
      inhalt: "Bitte einen Inhalt eingeben.",
      uhrzeit: "Uhrzeit bitte als HH:MM eingeben oder leer lassen.",
    });
    expect(eintragFormularSchema.safeParse({ ...eintrag, inhalt: "x", uhrzeit: "1405" }).success).toBe(true);
  });

  it("Gemeinsam arbeiten: Kurzcode nur auf dem Kurzcode-Weg, sechs Ziffern", () => {
    const start = { name: "Anna", funktion: "", fahrzeug: "", weg: "kurzcode", kurzcode: "123 45" } as const;
    expect(meldungen(sitzungStartFormularSchema.safeParse(start))).toEqual({ kurzcode: "Der Kurzcode hat sechs Ziffern." });
    expect(sitzungStartFormularSchema.parse({ ...start, kurzcode: "123 456" }).kurzcode).toBe("123456");
    expect(sitzungStartFormularSchema.safeParse({ ...start, weg: "qr", kurzcode: "" }).success).toBe(true);
    expect(meldungen(sitzungStartFormularSchema.safeParse({ ...start, name: "" })).name).toBe("Bitte einen Namen angeben.");
  });

  it("Mail: Empfänger leer oder gültige Adressen", () => {
    expect(empfaengerSchema.safeParse("").success).toBe(true);
    expect(empfaengerSchema.safeParse("a@b.de, c@d.de").success).toBe(true);
    expect(meldungen(empfaengerSchema.safeParse("a@b.de; leitstelle"))).toEqual({
      "": "„leitstelle“ ist keine gültige E-Mail-Adresse.",
    });
  });
});
