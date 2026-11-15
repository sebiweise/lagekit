"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/core/db/db";
import { vonAnVorschlaege } from "./logic";
import { eintraege, verfasserLesen } from "./repository";

/** Alle Einträge des Einsatzes, nach Nummer aufsteigend. */
export function useEintraege(einsatzId: string | undefined) {
  return useLiveQuery(
    async () =>
      einsatzId
        ? (await eintraege(getDb()).where("einsatzId").equals(einsatzId).toArray()).sort((a, b) => a.nr - b.nr)
        : [],
    [einsatzId],
  );
}

export function useVerfasser() {
  return useLiveQuery(() => verfasserLesen(getDb()), []);
}

/** Bereits genutzte Angaben aus „von“ und „an“, der aktuelle Einsatz zuerst. */
export function useVonAnVorschlaege(einsatzId: string) {
  return useLiveQuery(async () => vonAnVorschlaege(await eintraege(getDb()).toArray(), einsatzId), [einsatzId]) ?? [];
}
