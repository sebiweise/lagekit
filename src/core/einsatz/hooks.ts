"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/core/db/db";
import { aktiverEinsatz, einsaetzeAuflisten } from "./repository";

/** Alle Einsätze, aktualisiert sich bei jeder Änderung. `undefined` während des Ladens. */
export function useEinsaetze() {
  return useLiveQuery(() => einsaetzeAuflisten(getDb()), []);
}

/** Der aktive Einsatz; `null`, wenn keiner gewählt ist, `undefined` während des Ladens. */
export function useAktiverEinsatz() {
  return useLiveQuery(() => aktiverEinsatz(getDb()), []);
}
