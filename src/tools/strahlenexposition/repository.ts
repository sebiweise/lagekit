import type { Table } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import { STANDARD_RICHTWERT_ID, STANDARD_RICHTWERTE } from "./richtwerte";
import {
  aufenthaltSchema,
  personSchema,
  richtwertSchema,
  type Aufenthalt,
  type OdlEinheit,
  type Person,
  type Richtwert,
} from "./schema";

export const TABELLE_PERSONEN = "dosisPersonen";
export const TABELLE_AUFENTHALTE = "dosisAufenthalte";
const RICHTWERTE_SCHLUESSEL = "strahlenexposition.richtwerte";

export function personen(db: LagekitDB): Table<Person, string> {
  return db.table(TABELLE_PERSONEN);
}
export function aufenthalte(db: LagekitDB): Table<Aufenthalt, string> {
  return db.table(TABELLE_AUFENTHALTE);
}

export async function personAnlegen(
  db: LagekitDB,
  eingabe: { einsatzId: string; name: string; trupp?: string; richtwertId?: string },
  jetzt: Date = new Date(),
): Promise<Person> {
  const person = personSchema.parse({
    id: crypto.randomUUID(),
    einsatzId: eingabe.einsatzId,
    name: eingabe.name,
    trupp: eingabe.trupp ?? "",
    richtwertId: eingabe.richtwertId ?? STANDARD_RICHTWERT_ID,
    erstelltAm: jetzt.toISOString(),
  });
  await personen(db).add(person);
  return person;
}

export async function personAendern(
  db: LagekitDB,
  id: string,
  aenderung: Partial<Pick<Person, "name" | "trupp" | "richtwertId">>,
): Promise<void> {
  const person = await personen(db).get(id);
  if (!person) throw new Error("Person nicht gefunden");
  await personen(db).put(personSchema.parse({ ...person, ...aenderung }));
}

/** Löscht eine Person mit allen ihren Aufenthalten. */
export async function personLoeschen(db: LagekitDB, id: string): Promise<void> {
  await db.transaction("rw", personen(db), aufenthalte(db), async () => {
    await aufenthalte(db).where("personId").equals(id).delete();
    await personen(db).delete(id);
  });
}

export interface AufenthaltEingabe {
  ort: string;
  odl: number;
  odlEinheit: OdlEinheit;
}

async function laufender(db: LagekitDB, personId: string): Promise<Aufenthalt | undefined> {
  return (await aufenthalte(db).where("personId").equals(personId).toArray()).find(
    (a) => a.ende === null,
  );
}

/**
 * Startet einen laufenden Aufenthalt für jede genannte Person.
 * Personen mit bereits laufendem Aufenthalt werden übersprungen.
 */
export async function aufenthaltStarten(
  db: LagekitDB,
  personIds: string[],
  eingabe: AufenthaltEingabe,
  jetzt: Date = new Date(),
): Promise<Aufenthalt[]> {
  return db.transaction("rw", personen(db), aufenthalte(db), async () => {
    const neu: Aufenthalt[] = [];
    for (const personId of personIds) {
      const person = await personen(db).get(personId);
      if (!person) throw new Error("Person nicht gefunden");
      if (await laufender(db, personId)) continue;
      const aufenthalt = aufenthaltSchema.parse({
        id: crypto.randomUUID(),
        einsatzId: person.einsatzId,
        personId,
        ...eingabe,
        beginn: jetzt.toISOString(),
        ende: null,
        dosimeterMsv: null,
        erstelltAm: jetzt.toISOString(),
      });
      await aufenthalte(db).add(aufenthalt);
      neu.push(aufenthalt);
    }
    return neu;
  });
}

/** Beendet laufende Aufenthalte der genannten Personen. */
export async function aufenthaltBeenden(
  db: LagekitDB,
  personIds: string[],
  jetzt: Date = new Date(),
): Promise<number> {
  return db.transaction("rw", aufenthalte(db), async () => {
    let anzahl = 0;
    for (const personId of personIds) {
      const offen = await laufender(db, personId);
      if (!offen) continue;
      await aufenthalte(db).put(aufenthaltSchema.parse({ ...offen, ende: jetzt.toISOString() }));
      anzahl++;
    }
    return anzahl;
  });
}

/** Trägt einen abgeschlossenen Aufenthalt nach (z. B. vom Whiteboard übernommen). */
export async function aufenthaltNachtragen(
  db: LagekitDB,
  personId: string,
  eingabe: AufenthaltEingabe & { beginn: string; ende: string; dosimeterMsv?: number | null },
  jetzt: Date = new Date(),
): Promise<Aufenthalt> {
  const person = await personen(db).get(personId);
  if (!person) throw new Error("Person nicht gefunden");
  const aufenthalt = aufenthaltSchema.parse({
    id: crypto.randomUUID(),
    einsatzId: person.einsatzId,
    personId,
    ...eingabe,
    dosimeterMsv: eingabe.dosimeterMsv ?? null,
    erstelltAm: jetzt.toISOString(),
  });
  await aufenthalte(db).add(aufenthalt);
  return aufenthalt;
}

/** Trägt den am Dosimeter abgelesenen Wert für einen Aufenthalt ein (oder entfernt ihn). */
export async function dosimeterSetzen(db: LagekitDB, id: string, wertMsv: number | null): Promise<void> {
  const aufenthalt = await aufenthalte(db).get(id);
  if (!aufenthalt) throw new Error("Aufenthalt nicht gefunden");
  await aufenthalte(db).put(aufenthaltSchema.parse({ ...aufenthalt, dosimeterMsv: wertMsv }));
}

export async function aufenthaltLoeschen(db: LagekitDB, id: string): Promise<void> {
  await aufenthalte(db).delete(id);
}

/** Einstellbare Richtwerte; ohne Einstellung gelten die Standardwerte. */
export async function richtwerteLesen(db: LagekitDB): Promise<Richtwert[]> {
  const eintrag = await db.einstellungen.get(RICHTWERTE_SCHLUESSEL);
  const geprueft = richtwertSchema.array().min(1).safeParse(eintrag?.wert);
  return geprueft.success ? geprueft.data : STANDARD_RICHTWERTE;
}

export async function richtwerteSpeichern(db: LagekitDB, werte: Richtwert[] | null): Promise<void> {
  if (werte === null) {
    await db.einstellungen.delete(RICHTWERTE_SCHLUESSEL);
    return;
  }
  await db.einstellungen.put({
    schluessel: RICHTWERTE_SCHLUESSEL,
    wert: richtwertSchema.array().min(1).parse(werte),
  });
}
