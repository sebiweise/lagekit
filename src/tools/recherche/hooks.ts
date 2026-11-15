"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/core/db/db";
import { verlaufSortieren } from "./logic";
import { suchen } from "./repository";

/** Suchverlauf des Einsatzes, neueste zuerst. */
export function useSuchverlauf(einsatzId: string | undefined) {
  return useLiveQuery(
    async () => (einsatzId ? verlaufSortieren(await suchen(getDb()).where("einsatzId").equals(einsatzId).toArray()) : []),
    [einsatzId],
  );
}
