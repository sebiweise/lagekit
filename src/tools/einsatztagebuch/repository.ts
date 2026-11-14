import type { Table } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import { naechsteNummer } from "./logic";
import { eintragSchema, type Eintrag, type EintragArt } from "./schema";

export const TABELLE_EINTRAEGE = "tagebuchEintraege";
const VERFASSER_SCHLUESSEL = "einsatztagebuch.verfasser";

export function eintraege(db: LagekitDB): Table<Eintrag, string> {
  return db.table(TABELLE_EINTRAEGE);
}

export interface EintragEingabe {
  einsatzId: string;
  art: EintragArt;
  inhalt: string;
  von?: string;
  an?: string;
  verfasser?: string;
  /** Ereigniszeit; ohne Angabe die Erfassungszeit. */
  zeitpunkt?: Date;
  /** Id des Eintrags, der hiermit korrigiert wird. */
  korrigiertEintragId?: string | null;
}

/**
 * Hängt einen Eintrag an. Es gibt bewusst keine Funktion zum Ändern oder Löschen:
 * Das Tagebuch ist fortlaufend und nachvollziehbar.
 */
export async function eintragHinzufuegen(
  db: LagekitDB,
  eingabe: EintragEingabe,
  jetzt: Date = new Date(),
): Promise<Eintrag> {
  return db.transaction("rw", eintraege(db), async () => {
    const vorhandene = await eintraege(db).where("einsatzId").equals(eingabe.einsatzId).toArray();
    if (eingabe.korrigiertEintragId) {
      const alt = vorhandene.find((e) => e.id === eingabe.korrigiertEintragId);
      if (!alt) throw new Error("Zu korrigierender Eintrag nicht gefunden");
    }
    const eintrag = eintragSchema.parse({
      id: crypto.randomUUID(),
      einsatzId: eingabe.einsatzId,
      nr: naechsteNummer(vorhandene),
      zeitpunkt: (eingabe.zeitpunkt ?? jetzt).toISOString(),
      erfasstAm: jetzt.toISOString(),
      art: eingabe.art,
      von: eingabe.von ?? "",
      an: eingabe.an ?? "",
      inhalt: eingabe.inhalt,
      verfasser: eingabe.verfasser ?? "",
      korrigiertEintragId: eingabe.korrigiertEintragId ?? null,
    });
    await eintraege(db).add(eintrag);
    return eintrag;
  });
}

/** Verfasser wird je Gerät gemerkt, damit er nicht bei jedem Eintrag neu getippt wird. */
export async function verfasserLesen(db: LagekitDB): Promise<string> {
  const wert = (await db.einstellungen.get(VERFASSER_SCHLUESSEL))?.wert;
  return typeof wert === "string" ? wert : "";
}

export async function verfasserSpeichern(db: LagekitDB, verfasser: string): Promise<void> {
  await db.einstellungen.put({ schluessel: VERFASSER_SCHLUESSEL, wert: verfasser.trim() });
}
