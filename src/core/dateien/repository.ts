import type { LagekitDB } from "@/core/db/db";
import { vergleichen, type DateiInfo, type OrdnerHandle } from "./ordner";

/** Ein mit einem Einsatz verknüpfter Ordner auf diesem Gerät. */
export interface VerknuepfterOrdner {
  id: string;
  einsatzId: string;
  /** Anzeigename, zunächst der Ordnername. */
  name: string;
  handle: OrdnerHandle;
  verknuepftAm: string;
  /** Stand der letzten Prüfung. */
  dateien: DateiInfo[];
  /** Pfade, die seit dem letzten „Gesehen“ neu dazugekommen oder geändert sind. */
  neu: string[];
  geprueftAm: string | null;
  abgeschnitten: boolean;
}

export async function ordnerVerknuepfen(
  db: LagekitDB,
  einsatzId: string,
  handle: OrdnerHandle,
  jetzt: Date = new Date(),
): Promise<VerknuepfterOrdner> {
  const ordner: VerknuepfterOrdner = {
    id: crypto.randomUUID(),
    einsatzId,
    name: handle.name,
    handle,
    verknuepftAm: jetzt.toISOString(),
    dateien: [],
    neu: [],
    geprueftAm: null,
    abgeschnitten: false,
  };
  await db.ordner.add(ordner);
  return ordner;
}

export function ordnerEntfernen(db: LagekitDB, id: string): Promise<void> {
  return db.ordner.delete(id);
}

export function ordnerDesEinsatzes(db: LagekitDB, einsatzId: string): Promise<VerknuepfterOrdner[]> {
  return db.ordner.where("einsatzId").equals(einsatzId).sortBy("verknuepftAm");
}

/**
 * Übernimmt das Ergebnis einer Prüfung. Bei der ersten Prüfung gilt nichts als
 * neu (der Ordner war ja schon so); danach kommen neue und geänderte Dateien
 * zu `neu`, gelöschte fallen heraus. Rückgabe: Anzahl neu gemeldeter Dateien.
 */
export async function ordnerAbgleichen(
  db: LagekitDB,
  id: string,
  dateien: DateiInfo[],
  abgeschnitten: boolean,
  jetzt: Date = new Date(),
): Promise<number> {
  return db.transaction("rw", db.ordner, async () => {
    const ordner = await db.ordner.get(id);
    if (!ordner) return 0;
    const knapp = dateien.map(({ pfad, groesse, geaendert }) => ({ pfad, groesse, geaendert }));
    const erstePruefung = ordner.geprueftAm === null;
    const { neu, entfernt } = vergleichen(ordner.dateien, knapp);
    const weg = new Set(entfernt);
    const gemeldet = erstePruefung ? [] : neu.filter((p) => !ordner.neu.includes(p));
    await db.ordner.update(id, {
      dateien: knapp,
      neu: [...ordner.neu.filter((p) => !weg.has(p)), ...gemeldet],
      geprueftAm: jetzt.toISOString(),
      abgeschnitten,
    });
    return gemeldet.length;
  });
}

/** Neue Dateien als gesehen markieren. */
export async function neueGesehen(db: LagekitDB, id: string): Promise<void> {
  await db.ordner.update(id, { neu: [] });
}
