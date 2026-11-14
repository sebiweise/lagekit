"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/core/db/db";
import { aufenthalte, personen, richtwerteLesen } from "./repository";

export function usePersonen(einsatzId: string | undefined) {
  return useLiveQuery(
    async () =>
      einsatzId
        ? (await personen(getDb()).where("einsatzId").equals(einsatzId).toArray()).sort(
            (a, b) => a.trupp.localeCompare(b.trupp, "de") || a.name.localeCompare(b.name, "de"),
          )
        : [],
    [einsatzId],
  );
}

export function useAufenthalte(einsatzId: string | undefined) {
  return useLiveQuery(
    async () =>
      einsatzId
        ? (await aufenthalte(getDb()).where("einsatzId").equals(einsatzId).toArray()).sort((a, b) =>
            a.beginn.localeCompare(b.beginn),
          )
        : [],
    [einsatzId],
  );
}

export function useRichtwerte() {
  return useLiveQuery(() => richtwerteLesen(getDb()), []);
}
