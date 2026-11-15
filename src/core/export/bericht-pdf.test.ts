import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAnlegen } from "@/core/einsatz/repository";
import { eintragHinzufuegen } from "@/tools/einsatztagebuch/repository";
import { aufenthaltStarten, personAnlegen } from "@/tools/strahlenexposition/repository";
import { berichtPdf, pdfText } from "./bericht-pdf";
import { einsatzDatenLaden } from "./einsatz-paket";

const offen: LagekitDB[] = [];
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("Einsatzbericht als PDF", () => {
  it("ersetzt Zeichen, die die Standardschrift nicht kennt", () => {
    expect(pdfText("Müller → EL, 120 µSv/h · „Tank“ – Ḣ × t 🚒")).toBe("Müller -> EL, 120 µSv/h · „Tank“ – H × t ?");
  });

  it("erzeugt ein mehrseitiges PDF mit allen Einträgen", async () => {
    const db = new LagekitDB(`test-${crypto.randomUUID()}`);
    offen.push(db);
    const beginn = new Date("2026-11-15T08:00:00Z");
    const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2 Übung", ort: "Werk Nord" }, beginn);
    for (let i = 0; i < 80; i++) {
      await eintragHinzufuegen(
        db,
        { einsatzId: einsatz.id, art: "Meldung", inhalt: `Meldung ${i + 1}: Messtrupp → EL, Wert stabil ${"lang ".repeat(i % 7 * 5)}`, von: "MT 1", an: "EL" },
        new Date(beginn.getTime() + i * 60_000),
      );
    }
    const person = await personAnlegen(db, { einsatzId: einsatz.id, name: "Müller", trupp: "AT 1" });
    await aufenthaltStarten(db, [person.id], { ort: "Tank 3", odl: 100, odlEinheit: "µSv/h" }, beginn);

    const daten = (await einsatzDatenLaden(db, einsatz.id))!;
    const bytes = await berichtPdf(daten, { jetzt: new Date("2026-11-15T10:00:00Z") });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getTitle()).toBe("Einsatzbericht ABC 2 Übung");
  });
});
