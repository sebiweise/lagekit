"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/core/db/db";
import { aktiverEinsatz } from "@/core/einsatz/repository";
import { einsatzDatenLaden } from "./einsatz-paket";

/**
 * Einsatz für Export und Bericht: aus `?einsatz=<id>`, sonst der aktive.
 * `null`, wenn keiner da ist, `undefined` während des Ladens.
 */
export function useExportDaten() {
  const id = useSearchParams().get("einsatz");
  return useLiveQuery(async () => {
    const db = getDb();
    const einsatzId = id ?? (await aktiverEinsatz(db))?.id;
    return einsatzId ? einsatzDatenLaden(db, einsatzId) : null;
  }, [id]);
}

export function exportHref(pfad: string, einsatzId?: string): string {
  return einsatzId ? `${pfad}?einsatz=${encodeURIComponent(einsatzId)}` : pfad;
}
