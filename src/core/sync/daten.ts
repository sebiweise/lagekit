import type { Transaction } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import { exportErstellen } from "@/core/export/json";
import { einsatzSchema, type Einsatz } from "@/core/einsatz/schema";
import { toolTabellen } from "@/tools/registry";
import type { ZodType } from "zod";
import type { Aenderung, Nachricht } from "./protokoll";

/** Tabellen, die in einer Sitzung abgeglichen werden, mit ihrem Schema. */
export function syncTabellen(): Map<string, ZodType> {
  const tabellen = new Map<string, ZodType>([["einsaetze", einsatzSchema]]);
  for (const { name, schema } of toolTabellen()) tabellen.set(name, schema);
  return tabellen;
}

/** Einsatz-Kennung einer Zeile; bei `einsaetze` ist es die eigene Id. */
export function einsatzIdVon(tabelle: string, zeile: { id: string; einsatzId?: unknown }): string | undefined {
  if (tabelle === "einsaetze") return zeile.id;
  return typeof zeile.einsatzId === "string" ? zeile.einsatzId : undefined;
}

const fernTransaktionen = new WeakSet<object>();

/** Stammt die Transaktion aus dem Abgleich? Dann wird sie nicht erneut verschickt. */
export function istFernTransaktion(tx: Transaction | null | undefined): boolean {
  let t: (Transaction & { parent?: Transaction }) | null | undefined = tx;
  while (t) {
    if (fernTransaktionen.has(t)) return true;
    t = t.parent;
  }
  return false;
}

export class AbgleichFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbgleichFehler";
  }
}

/**
 * Wendet Änderungen der Gegenseite an. Nur bekannte Tabellen und nur Zeilen des
 * Sitzungs-Einsatzes; jede Zeile wird gegen ihr Schema geprüft. Alles oder nichts.
 */
export async function aenderungenAnwenden(db: LagekitDB, einsatzId: string, liste: Aenderung[]): Promise<void> {
  if (liste.length === 0) return;
  const tabellen = syncTabellen();
  const geprueft: Aenderung[] = [];
  for (const a of liste) {
    const schema = tabellen.get(a.tabelle);
    if (!schema) throw new AbgleichFehler(`Unbekannte Tabelle ${a.tabelle}`);
    if (a.art === "put") {
      const zeile = schema.parse(a.zeile) as { id: string; einsatzId?: unknown };
      if (einsatzIdVon(a.tabelle, zeile) !== einsatzId) throw new AbgleichFehler("Zeile gehört zu einem anderen Einsatz");
      geprueft.push({ ...a, zeile });
    } else {
      geprueft.push(a);
    }
  }
  const namen = [...new Set(geprueft.map((a) => a.tabelle))];
  await db.transaction("rw", namen.map((n) => db.table(n)), async (tx) => {
    fernTransaktionen.add(tx);
    for (const a of geprueft) {
      const tabelle = db.table(a.tabelle);
      if (a.art === "put") {
        await tabelle.put(a.zeile);
      } else {
        // Löschen nur innerhalb des Sitzungs-Einsatzes.
        const vorhanden = (await tabelle.get(a.id)) as { id: string; einsatzId?: unknown } | undefined;
        if (vorhanden && einsatzIdVon(a.tabelle, vorhanden) === einsatzId) await tabelle.delete(a.id);
      }
    }
  });
}

/** Vollständiger Stand eines Einsatzes für einen neuen Gast. */
export async function standErstellen(db: LagekitDB, einsatzId: string): Promise<Extract<Nachricht, { typ: "stand" }>> {
  const exp = await exportErstellen(db, { einsatzIds: [einsatzId] });
  const einsatz = exp.einsaetze[0];
  if (!einsatz) throw new AbgleichFehler("Einsatz nicht gefunden");
  return { typ: "stand", einsatz, tabellen: exp.tabellen };
}

/**
 * Übernimmt den Stand des Hosts: Der Einsatz auf diesem Gerät wird zur genauen
 * Kopie, lokale Zeilen dieses Einsatzes, die der Host nicht hat, werden entfernt.
 */
export async function standAnwenden(db: LagekitDB, stand: Extract<Nachricht, { typ: "stand" }>): Promise<Einsatz> {
  const tabellen = syncTabellen();
  const einsatz = einsatzSchema.parse(stand.einsatz);
  const zeilen = new Map<string, { id: string }[]>();
  for (const [name, liste] of Object.entries(stand.tabellen)) {
    const schema = tabellen.get(name);
    if (!schema || name === "einsaetze") continue; // Unbekannte Tabellen (neuere App-Version) überspringen.
    zeilen.set(
      name,
      liste.map((z) => {
        const zeile = schema.parse(z) as { id: string; einsatzId?: unknown };
        if (einsatzIdVon(name, zeile) !== einsatz.id) throw new AbgleichFehler("Zeile gehört zu einem anderen Einsatz");
        return zeile;
      }),
    );
  }
  const namen = [...tabellen.keys()];
  await db.transaction("rw", namen.map((n) => db.table(n)), async (tx) => {
    fernTransaktionen.add(tx);
    await db.einsaetze.put(einsatz);
    for (const name of namen) {
      if (name === "einsaetze") continue;
      const tabelle = db.table(name);
      const neu = zeilen.get(name) ?? [];
      const ids = new Set(neu.map((z) => z.id));
      const alt = (await tabelle.where("einsatzId").equals(einsatz.id).primaryKeys()) as string[];
      await tabelle.bulkDelete(alt.filter((id) => !ids.has(id)));
      await tabelle.bulkPut(neu);
    }
  });
  return einsatz;
}
