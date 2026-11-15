"use client";

import { useSyncExternalStore } from "react";
import type { LagekitDB } from "@/core/db/db";
import { aktiverEinsatzId } from "@/core/einsatz/repository";
import { dateienMeldung } from "@/core/benachrichtigungen/texte";
import { benachrichtigen } from "@/core/benachrichtigungen/verlauf";
import { ordnerDurchsuchen, zugriffAnfragen, zugriffPruefen, type Zugriff } from "./ordner";
import { ordnerAbgleichen, ordnerDesEinsatzes, type VerknuepfterOrdner } from "./repository";

/** Abstand der Prüfungen, solange Lagekit sichtbar ist. */
export const PRUEF_ABSTAND_MS = 15_000;

/** Zugriffsstand je Ordner-Id, nur im Speicher (hängt an der Browser-Sitzung). */
let zugriffe: ReadonlyMap<string, Zugriff> = new Map();
const zuhoerer = new Set<() => void>();

function zugriffSetzen(id: string, zugriff: Zugriff) {
  if (zugriffe.get(id) === zugriff) return;
  zugriffe = new Map(zugriffe).set(id, zugriff);
  for (const z of zuhoerer) z();
}

const LEER: ReadonlyMap<string, Zugriff> = new Map();

export function useZugriffe(): ReadonlyMap<string, Zugriff> {
  return useSyncExternalStore(
    (z) => {
      zuhoerer.add(z);
      return () => zuhoerer.delete(z);
    },
    () => zugriffe,
    () => LEER,
  );
}

/**
 * Prüft einen Ordner, wenn der Zugriff erlaubt ist. Fragt nie selbst nach der
 * Erlaubnis (das geht nur aus einem Klick heraus). Rückgabe: neue Dateien.
 */
export async function ordnerPruefen(db: LagekitDB, ordner: VerknuepfterOrdner): Promise<number> {
  let zugriff: Zugriff;
  try {
    zugriff = await zugriffPruefen(ordner.handle);
  } catch {
    zugriff = "verweigert";
  }
  zugriffSetzen(ordner.id, zugriff);
  if (zugriff !== "erlaubt") return 0;
  try {
    const { dateien, abgeschnitten } = await ordnerDurchsuchen(ordner.handle);
    return await ordnerAbgleichen(db, ordner.id, dateien, abgeschnitten);
  } catch {
    // Ordner gelöscht, umbenannt oder Laufwerk getrennt.
    zugriffSetzen(ordner.id, "verweigert");
    return 0;
  }
}

/** Aus einem Klick heraus: Erlaubnis holen und gleich prüfen. */
export async function zugriffErlauben(db: LagekitDB, ordner: VerknuepfterOrdner): Promise<Zugriff> {
  const zugriff = await zugriffAnfragen(ordner.handle);
  zugriffSetzen(ordner.id, zugriff);
  if (zugriff === "erlaubt") await ordnerPruefen(db, ordner);
  return zugriff;
}

let laeuft = false;

async function rundePruefen(db: LagekitDB) {
  if (laeuft || document.hidden) return;
  laeuft = true;
  try {
    const einsatzId = await aktiverEinsatzId(db);
    if (!einsatzId) return;
    const neu: { name: string; anzahl: number }[] = [];
    for (const ordner of await ordnerDesEinsatzes(db, einsatzId)) {
      neu.push({ name: ordner.name, anzahl: await ordnerPruefen(db, ordner) });
    }
    const meldung = dateienMeldung(neu);
    if (meldung) benachrichtigen(meldung);
  } finally {
    laeuft = false;
  }
}

/**
 * Prüft die Ordner des aktiven Einsatzes regelmäßig, solange die App offen und
 * sichtbar ist. Beim Zurückkehren in die App sofort. Rückgabe: Stopp-Funktion.
 */
export function ueberwachungStarten(db: LagekitDB): () => void {
  const pruefen = () => void rundePruefen(db);
  pruefen();
  const takt = setInterval(pruefen, PRUEF_ABSTAND_MS);
  document.addEventListener("visibilitychange", pruefen);
  return () => {
    clearInterval(takt);
    document.removeEventListener("visibilitychange", pruefen);
  };
}
