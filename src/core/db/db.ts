import Dexie, { type EntityTable } from "dexie";
import type { Einsatz } from "@/core/einsatz/schema";
import { migrations } from "./migrations";

export const DB_NAME = "lagekit";

export class LagekitDB extends Dexie {
  einsaetze!: EntityTable<Einsatz, "id">;

  constructor(name: string = DB_NAME) {
    super(name);
    for (const migration of migrations) {
      const version = this.version(migration.version).stores(migration.stores);
      if (migration.upgrade) version.upgrade(migration.upgrade);
    }
  }
}

let instance: LagekitDB | undefined;

/** Gemeinsame Datenbank-Instanz; nur im Browser verwenden. */
export function getDb(): LagekitDB {
  instance ??= new LagekitDB();
  return instance;
}
