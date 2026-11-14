import { afterEach, describe, expect, it } from "vitest";
import { LagekitDB } from "./db";
import { migrations } from "./migrations";

const offen: LagekitDB[] = [];

function testDb(): LagekitDB {
  const db = new LagekitDB(`test-${crypto.randomUUID()}`);
  offen.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(offen.splice(0).map((db) => db.delete()));
});

describe("Migrationen", () => {
  it("haben aufsteigende, lückenlose Versionsnummern ab 1", () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });

  it("öffnen die Datenbank in der neuesten Version mit allen Tabellen", async () => {
    const db = testDb();
    await db.open();
    expect(db.verno).toBe(migrations.at(-1)!.version);
    expect(db.tables.map((t) => t.name)).toContain("einsaetze");
  });
});
