import type { LagekitDB } from "@/core/db/db";
import { toolTabellen } from "@/tools/registry";
import { einsatzSchema, neuerEinsatzSchema, type Einsatz, type NeuerEinsatz } from "./schema";

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

/** Setzt den Einsatzort (Text und optional Koordinaten), z. B. aus Standort oder Karte. */
export function einsatzOrtSetzen(
  db: LagekitDB,
  id: string,
  ort: string,
  koordinaten: Einsatz["koordinaten"],
  jetzt: Date = new Date(),
): Promise<Einsatz> {
  return aendern(db, id, { ort, koordinaten }, jetzt);
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
  await db.transaction("rw", [db.einsaetze, db.einstellungen, db.ordner, ...tabellen], async () => {
    for (const tabelle of [...tabellen, db.ordner]) await tabelle.where("einsatzId").equals(id).delete();
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
