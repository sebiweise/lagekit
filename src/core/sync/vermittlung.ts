/**
 * Client für den Vermittlungsdienst (Kurzcode-Weg).
 *
 * Über den Dienst laufen nur Beitrittsanfrage und Antwort, also die
 * Verbindungsdaten. Die Einsatzdaten gehen danach direkt von Gerät zu Gerät.
 * Welcher Dienst das ist, legt die Installation fest (siehe dienst-adresse.ts).
 */

import { kurzcodeDienst } from "./dienst-konfiguration";

export class VermittlungFehler extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "VermittlungFehler";
  }
}

async function aufrufen<T>(daten: Record<string, unknown>): Promise<T> {
  const dienst = await kurzcodeDienst();
  if (!dienst) {
    throw new VermittlungFehler("Kurzcode ist in dieser Installation ausgeschaltet. Nutzen Sie den Weg mit QR-Code.");
  }
  let antwort: Response;
  try {
    antwort = await fetch(dienst.endpunkt, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(daten),
      cache: "no-store",
    });
  } catch {
    throw new VermittlungFehler("Keine Internetverbindung. Nutzen Sie den Weg mit QR-Code.");
  }
  const inhalt = (await antwort.json().catch(() => ({}))) as T & { fehler?: string };
  if (!antwort.ok) {
    throw new VermittlungFehler(inhalt.fehler ?? "Der Vermittlungsdienst ist nicht erreichbar.", antwort.status);
  }
  return inhalt;
}

export interface Vermittlung {
  sitzungAnlegen(): Promise<{ kurzcode: string; schluessel: string }>;
  anfragenAbholen(kurzcode: string, schluessel: string): Promise<{ anfrageId: string; anfrage: string }[]>;
  antworten(kurzcode: string, schluessel: string, anfrageId: string, antwort: string | null): Promise<void>;
  sitzungBeenden(kurzcode: string, schluessel: string): Promise<void>;
  anfrageSenden(kurzcode: string, anfrage: string): Promise<string>;
  antwortAbholen(anfrageId: string): Promise<{ status: "wartet" | "abgelehnt" | "zugelassen"; antwort?: string }>;
}

export const vermittlung: Vermittlung = {
  sitzungAnlegen: () => aufrufen({ aktion: "sitzung" }),
  anfragenAbholen: async (kurzcode, schluessel) =>
    (await aufrufen<{ anfragen: { anfrageId: string; anfrage: string }[] }>({ aktion: "abholen", kurzcode, schluessel }))
      .anfragen,
  antworten: async (kurzcode, schluessel, anfrageId, antwort) => {
    await aufrufen({ aktion: "antworten", kurzcode, schluessel, anfrageId, antwort });
  },
  sitzungBeenden: async (kurzcode, schluessel) => {
    await aufrufen({ aktion: "beenden", kurzcode, schluessel });
  },
  anfrageSenden: async (kurzcode, anfrage) =>
    (await aufrufen<{ anfrageId: string }>({ aktion: "anfrage", kurzcode, anfrage })).anfrageId,
  antwortAbholen: (anfrageId) => aufrufen({ aktion: "antwort", anfrageId }),
};
