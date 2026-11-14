import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "@/core/db/db";
import { einsatzAbschliessen, einsatzAnlegen } from "@/core/einsatz/repository";
import { eintragHinzufuegen } from "@/tools/einsatztagebuch/repository";
import { personAnlegen, personLoeschen } from "@/tools/strahlenexposition/repository";
import { aenderungenAnwenden, AbgleichFehler, standAnwenden, standErstellen } from "./daten";
import { aenderungenBeobachten } from "./erfassung";
import type { Aenderung } from "./protokoll";
import { anfrageSchema, PRAEFIX_ANFRAGE } from "./protokoll";
import { codeErstellen, codeLesen, sdpAufbauen, sdpVerdichten, VerbindungscodeFehler } from "./verbindungscode";

const offen: LagekitDB[] = [];
function testDb() {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

const SDP = [
  "v=0",
  "o=- 1682520125856417723 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:2699257411 1 udp 2113937151 b117b7cc-7730-4b54-9b61-74a50fcff79e.local 59572 typ host generation 0 network-cost 999",
  "a=candidate:1 1 tcp 1518280447 192.168.1.5 9 typ host tcptype active",
  "a=candidate:2 1 udp 2113939711 192.168.1.5 50000 typ host",
  "a=ice-ufrag:Cyi8",
  "a=ice-pwd:I8tu/L8LXEUpbsHsWs1lNylp",
  "a=fingerprint:sha-256 4B:40:C0:BF:E1:9F:C9:44:E8:4B:9F:B9:35:D2:DC:2A:E1:7C:08:C9:33:25:DE:C6:E5:6C:C9:90:BD:B2:30:DA",
  "a=setup:actpass",
  "",
].join("\r\n");

describe("Verbindungscode", () => {
  it("verdichtet ein SDP und baut es wieder auf", () => {
    const k = sdpVerdichten(SDP);
    expect(k.u).toBe("Cyi8");
    expect(k.k).toEqual([
      ["b117b7cc-7730-4b54-9b61-74a50fcff79e.local", 59572],
      ["192.168.1.5", 50000],
    ]);
    const neu = sdpAufbauen(k, "answer");
    expect(neu).toContain("a=fingerprint:sha-256 4B:40:C0:BF:E1:9F:C9:44");
    expect(neu).toContain("a=setup:active");
    expect(neu).toContain("a=candidate:2 1 udp 2113937150 192.168.1.5 50000 typ host");
  });

  it("packt eine Anfrage in einen kurzen Code und liest sie wieder", async () => {
    const anfrage = {
      v: 1 as const,
      t: { geraetId: crypto.randomUUID(), name: "Meier", funktion: "Führungsassistent", fahrzeug: "ELW 1", geraet: "Windows · Edge" },
      s: sdpVerdichten(SDP),
    };
    const code = await codeErstellen(PRAEFIX_ANFRAGE, anfrage);
    expect(code.length).toBeLessThan(400);
    expect(await codeLesen(PRAEFIX_ANFRAGE, ` ${code}\n`, anfrageSchema)).toEqual(anfrage);
    await expect(codeLesen("LKB1", code, anfrageSchema)).rejects.toThrow(VerbindungscodeFehler);
    await expect(codeLesen(PRAEFIX_ANFRAGE, `${code.slice(0, 40)}`, anfrageSchema)).rejects.toThrow(/beschädigt/);
  });
});

describe("Abgleich", () => {
  it("meldet lokale Änderungen des Einsatzes, aber nicht die eines anderen", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2" });
    const anderer = await einsatzAnlegen(db, { stichwort: "Übung" });
    const gemeldet: Aenderung[] = [];
    const abmelden = aenderungenBeobachten(db, einsatz.id, (l) => gemeldet.push(...l));

    const person = await personAnlegen(db, { einsatzId: einsatz.id, name: "Meier" });
    await personAnlegen(db, { einsatzId: anderer.id, name: "Fremd" });
    await eintragHinzufuegen(db, { einsatzId: einsatz.id, inhalt: "Lage erkundet", art: "Lage", verfasser: "EL" });
    await einsatzAbschliessen(db, einsatz.id);
    await personLoeschen(db, person.id);
    await new Promise((r) => setTimeout(r, 10));
    abmelden();

    expect(gemeldet.map((a) => `${a.art}:${a.tabelle}`)).toEqual([
      "put:dosisPersonen",
      "put:tagebuchEintraege",
      "put:einsaetze",
      "loeschen:dosisPersonen",
    ]);
    const einsatzAenderung = gemeldet[2];
    expect(einsatzAenderung.art === "put" && einsatzAenderung.zeile).toMatchObject({ status: "abgeschlossen" });
  });

  it("überträgt Stand und Änderungen auf ein zweites Gerät, ohne Echo", async () => {
    const host = testDb();
    const gast = testDb();
    const einsatz = await einsatzAnlegen(host, { stichwort: "ABC 2" });
    await personAnlegen(host, { einsatzId: einsatz.id, name: "Meier" });

    const uebernommen = await standAnwenden(gast, await standErstellen(host, einsatz.id));
    expect(uebernommen.stichwort).toBe("ABC 2");
    expect(await gast.table("dosisPersonen").count()).toBe(1);

    const echo: Aenderung[] = [];
    const abmelden = aenderungenBeobachten(gast, einsatz.id, (l) => echo.push(...l));
    const meldungen: Aenderung[] = [];
    const abmeldenHost = aenderungenBeobachten(host, einsatz.id, (l) => meldungen.push(...l));
    await personAnlegen(host, { einsatzId: einsatz.id, name: "Schulz" });
    await new Promise((r) => setTimeout(r, 10));
    await aenderungenAnwenden(gast, einsatz.id, meldungen);
    await new Promise((r) => setTimeout(r, 10));
    abmelden();
    abmeldenHost();

    expect(await gast.table("dosisPersonen").count()).toBe(2);
    expect(echo).toEqual([]);
  });

  it("lehnt Zeilen anderer Einsätze und ungültige Zeilen ab", async () => {
    const db = testDb();
    const einsatz = await einsatzAnlegen(db, { stichwort: "ABC 2" });
    const fremd = crypto.randomUUID();
    await expect(
      aenderungenAnwenden(db, einsatz.id, [
        { art: "put", tabelle: "dosisPersonen", zeile: { id: crypto.randomUUID(), einsatzId: fremd, name: "X", trupp: "", richtwertId: "personen", erstelltAm: new Date().toISOString() } },
      ]),
    ).rejects.toThrow(AbgleichFehler);
    await expect(
      aenderungenAnwenden(db, einsatz.id, [{ art: "put", tabelle: "dosisPersonen", zeile: { id: "x", einsatzId: einsatz.id } }]),
    ).rejects.toThrow();
    await expect(aenderungenAnwenden(db, einsatz.id, [{ art: "loeschen", tabelle: "geheim", id: "x" }])).rejects.toThrow(
      /Unbekannte Tabelle/,
    );
  });

  it("vergibt beim Host eindeutige Tagebuchnummern", async () => {
    const host = testDb();
    const gast = testDb();
    const einsatz = await einsatzAnlegen(host, { stichwort: "ABC 2" });
    await standAnwenden(gast, await standErstellen(host, einsatz.id));
    await eintragHinzufuegen(host, { einsatzId: einsatz.id, inhalt: "vom Host", art: "Notiz" });

    // Gast war getrennt und hat ebenfalls Nummer 1 vergeben.
    const meldungen: Aenderung[] = [];
    const ab = aenderungenBeobachten(gast, einsatz.id, (l) => meldungen.push(...l));
    await eintragHinzufuegen(gast, { einsatzId: einsatz.id, inhalt: "vom Gast", art: "Notiz" });
    await new Promise((r) => setTimeout(r, 10));
    ab();
    expect(meldungen[0].art === "put" && meldungen[0].zeile.nr).toBe(1);

    const gespeichert = await aenderungenAnwenden(host, einsatz.id, meldungen, { konflikteLoesen: true });
    expect(gespeichert[0].art === "put" && gespeichert[0].zeile.nr).toBe(2);
    const nummern = (await host.table("tagebuchEintraege").toArray()).map((e) => e.nr).sort();
    expect(nummern).toEqual([1, 2]);

    // Dieselbe Zeile erneut (z. B. doppelt nachgereicht) behält ihre Nummer.
    const nochmal = await aenderungenAnwenden(host, einsatz.id, meldungen, { konflikteLoesen: true });
    expect(nochmal[0].art === "put" && nochmal[0].zeile.nr).toBe(2);
  });

  it("macht den Gast-Stand zur genauen Kopie des Hosts", async () => {
    const host = testDb();
    const gast = testDb();
    const einsatz = await einsatzAnlegen(host, { stichwort: "ABC 2" });
    await standAnwenden(gast, await standErstellen(host, einsatz.id));
    await personAnlegen(gast, { einsatzId: einsatz.id, name: "Nur lokal" });
    await standAnwenden(gast, await standErstellen(host, einsatz.id));
    expect(await gast.table("dosisPersonen").count()).toBe(0);
  });
});
