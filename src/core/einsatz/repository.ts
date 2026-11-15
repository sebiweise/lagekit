import type { LagekitDB } from "@/core/db/db";
import { toolTabellen } from "@/tools/registry";
import { eintraege, eintragHinzufuegen, verfasserLesen } from "@/tools/einsatztagebuch/repository";
import { aenderungenBeschreiben } from "./logic";
import {
  einsatzAenderungSchema,
  einsatzSchema,
  neuerEinsatzSchema,
  type Einsatz,
  type EinsatzAenderung,
  type NeuerEinsatz,
} from "./schema";

const AKTIVER_EINSATZ = "aktiverEinsatz";

/** Legt einen Einsatz an und macht ihn zum aktiven Einsatz. */
export async function einsatzAnlegen(
  db: LagekitDB,
  eingabe: NeuerEinsatz,
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  const daten = neuerEinsatzSchema.parse(eingabe);
  const zeitpunkt = jetzt.toISOString();
  const einsatz = einsatzSchema.parse({
    ...daten,
    id: crypto.randomUUID(),
    beginn: daten.beginn ?? zeitpunkt,
    ende: null,
    status: "aktiv",
    erstelltAm: zeitpunkt,
    geaendertAm: zeitpunkt,
  });
  await db.transaction("rw", db.einsaetze, db.einstellungen, async () => {
    await db.einsaetze.add(einsatz);
    await db.einstellungen.put({ schluessel: AKTIVER_EINSATZ, wert: einsatz.id });
  });
  return einsatz;
}

/** Alle Einsätze, neueste zuerst. */
export async function einsaetzeAuflisten(db: LagekitDB): Promise<Einsatz[]> {
  return db.einsaetze.orderBy("beginn").reverse().toArray();
}

async function aendern(
  db: LagekitDB,
  id: string,
  aenderung: Partial<Pick<Einsatz, "ende" | "status" | "ort" | "koordinaten">>,
  jetzt: Date,
): Promise<Einsatz> {
  const einsatz = await db.einsaetze.get(id);
  if (!einsatz) throw new Error(`Einsatz ${id} nicht gefunden`);
  const neu = einsatzSchema.parse({ ...einsatz, ...aenderung, geaendertAm: jetzt.toISOString() });
  await db.einsaetze.put(neu);
  return neu;
}

/** Schließt einen Einsatz ab; das Ende ist der übergebene Zeitpunkt. */
export function einsatzAbschliessen(
  db: LagekitDB,
  id: string,
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  return aendern(db, id, { status: "abgeschlossen", ende: jetzt.toISOString() }, jetzt);
}

/**
 * Ändert die Stammdaten eines Einsatzes (Stichwort, Ort, Einheit, Beginn).
 * Jede tatsächliche Änderung wird im Einsatztagebuch als Notiz festgehalten,
 * damit nachvollziehbar bleibt, unter welchem Stichwort und Ort der Einsatz lief.
 * Ohne Änderung wird nichts gespeichert.
 */
export async function einsatzBearbeiten(
  db: LagekitDB,
  id: string,
  eingabe: EinsatzAenderung,
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  const aenderung = einsatzAenderungSchema.parse(eingabe);
  return db.transaction("rw", [db.einsaetze, db.einstellungen, eintraege(db)], async () => {
    const alt = await db.einsaetze.get(id);
    if (!alt) throw new Error(`Einsatz ${id} nicht gefunden`);
    const kandidat = einsatzSchema.parse({ ...alt, ...aenderung });
    if (kandidat.ende && kandidat.beginn > kandidat.ende) {
      throw new Error("Der Beginn liegt nach dem Ende des Einsatzes.");
    }
    const zeilen = aenderungenBeschreiben(alt, kandidat);
    if (zeilen.length === 0) return alt;
    const neu = einsatzSchema.parse({ ...kandidat, geaendertAm: jetzt.toISOString() });
    await db.einsaetze.put(neu);
    await eintragHinzufuegen(
      db,
      {
        einsatzId: id,
        art: "Notiz",
        inhalt: ["Einsatzdaten geändert:", ...zeilen].join("\n"),
        verfasser: await verfasserLesen(db),
      },
      jetzt,
    );
    return neu;
  });
}

/** Setzt den Einsatzort (Text und optional Koordinaten), z. B. aus Standort oder Karte. */
export function einsatzOrtSetzen(
  db: LagekitDB,
  id: string,
  ort: string,
  koordinaten: Einsatz["koordinaten"],
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  return einsatzBearbeiten(db, id, { ort, koordinaten }, jetzt);
}

/** Öffnet einen abgeschlossenen Einsatz wieder (z. B. nach versehentlichem Abschluss). */
export function einsatzWiederOeffnen(
  db: LagekitDB,
  id: string,
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  return aendern(db, id, { status: "aktiv", ende: null }, jetzt);
}

/** Löscht einen Einsatz mitsamt allen Tool-Daten dazu. */
export async function einsatzLoeschen(db: LagekitDB, id: string): Promise<void> {
  const tabellen = toolTabellen().map((t) => db.table(t.name));
  await db.transaction("rw", [db.einsaetze, db.einstellungen, ...tabellen], async () => {
    for (const tabelle of tabellen) await tabelle.where("einsatzId").equals(id).delete();
    await db.einsaetze.delete(id);
    if ((await aktiverEinsatzId(db)) === id) await db.einstellungen.delete(AKTIVER_EINSATZ);
  });
}

export async function aktiverEinsatzId(db: LagekitDB): Promise<string | null> {
  const eintrag = await db.einstellungen.get(AKTIVER_EINSATZ);
  return typeof eintrag?.wert === "string" ? eintrag.wert : null;
}

/** Der aktive Einsatz, falls gesetzt und noch vorhanden. */
export async function aktiverEinsatz(db: LagekitDB): Promise<Einsatz | null> {
  const id = await aktiverEinsatzId(db);
  return (id && (await db.einsaetze.get(id))) || null;
}

export async function aktivenEinsatzSetzen(db: LagekitDB, id: string | null): Promise<void> {
  if (id === null) {
    await db.einstellungen.delete(AKTIVER_EINSATZ);
    return;
  }
  if (!(await db.einsaetze.get(id))) throw new Error(`Einsatz ${id} nicht gefunden`);
  await db.einstellungen.put({ schluessel: AKTIVER_EINSATZ, wert: id });
}
