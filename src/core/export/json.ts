import { z } from "zod";
import type { LagekitDB } from "@/core/db/db";
import { einsatzSchema, type Einsatz } from "@/core/einsatz/schema";
import { APP_VERSION } from "@/core/version";
import { toolTabellen } from "@/tools/registry";
import type { ToolManifest } from "@/tools/types";
import { toolRegistry } from "@/tools/registry";

/**
 * JSON-Sicherung: dient zur Übernahme auf ein anderes Gerät und als Backup.
 * Das Format ist versioniert; ältere Dateien müssen immer importierbar bleiben.
 */
export const EXPORT_FORMAT = "lagekit-export";
export const EXPORT_FORMAT_VERSION = 1;

const zeileSchema = z.looseObject({ id: z.string(), einsatzId: z.string() });

export const exportDateiSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.literal(EXPORT_FORMAT_VERSION),
  appVersion: z.string(),
  exportiertAm: z.iso.datetime({ offset: true }),
  einsaetze: z.array(einsatzSchema),
  /** Tool-Tabellen nach Tabellenname, z. B. `{ "dosisPersonen": [...] }`. */
  tabellen: z.record(z.string(), z.array(zeileSchema)),
});

export type ExportDatei = z.infer<typeof exportDateiSchema>;

/** Exportiert alle Einsätze oder nur die angegebenen, jeweils mit allen Tool-Daten. */
export async function exportErstellen(
  db: LagekitDB,
  optionen: { einsatzIds?: string[]; jetzt?: Date; tools?: ToolManifest[] } = {},
): Promise<ExportDatei> {
  const { einsatzIds, jetzt = new Date(), tools = toolRegistry } = optionen;
  const einsaetze = einsatzIds
    ? (await db.einsaetze.bulkGet(einsatzIds)).filter((e): e is Einsatz => Boolean(e))
    : await db.einsaetze.orderBy("beginn").toArray();
  const ids = einsaetze.map((e) => e.id);

  const tabellen: ExportDatei["tabellen"] = {};
  for (const { name } of toolTabellen(tools)) {
    tabellen[name] = await db.table(name).where("einsatzId").anyOf(ids).toArray();
  }

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportiertAm: jetzt.toISOString(),
    einsaetze,
    tabellen,
  };
}

export interface ImportErgebnis {
  einsaetzeNeu: number;
  einsaetzeAktualisiert: number;
  einsaetzeUnveraendert: number;
  zeilenNeu: number;
  zeilenVorhanden: number;
  unbekannteTabellen: string[];
}

export class ImportFehler extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ImportFehler";
  }
}

/** Liest und prüft den Inhalt einer Exportdatei. */
export function exportDateiLesen(text: string): ExportDatei {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch (cause) {
    throw new ImportFehler("Die Datei ist kein gültiges JSON.", { cause });
  }
  const ergebnis = exportDateiSchema.safeParse(roh);
  if (!ergebnis.success) {
    throw new ImportFehler("Die Datei ist keine Lagekit-Sicherung oder beschädigt.", {
      cause: ergebnis.error,
    });
  }
  return ergebnis.data;
}

/**
 * Übernimmt eine Exportdatei in die lokale Datenbank, ohne vorhandene Daten zu löschen.
 *
 * - Einsätze: Ist ein Einsatz schon vorhanden, gewinnt die Fassung mit dem
 *   späteren `geaendertAm`.
 * - Tool-Zeilen: Werden nur ergänzt, vorhandene Zeilen (gleiche `id`) bleiben
 *   unverändert. Tagebuch- und Dosiseinträge werden nie überschrieben.
 */
export async function importieren(
  db: LagekitDB,
  datei: ExportDatei,
  optionen: { tools?: ToolManifest[] } = {},
): Promise<ImportErgebnis> {
  const bekannte = new Map(toolTabellen(optionen.tools ?? toolRegistry).map((t) => [t.name, t]));
  const unbekannteTabellen = Object.keys(datei.tabellen).filter((name) => !bekannte.has(name));

  // Zuerst alles prüfen, dann in einer Transaktion schreiben: ganz oder gar nicht.
  const zeilenJeTabelle = [...bekannte.values()].map(({ name, schema }) => {
    const zeilen = (datei.tabellen[name] ?? []).map((zeile, index) => {
      const geprueft = schema.safeParse(zeile);
      if (!geprueft.success) {
        throw new ImportFehler(`Ungültiger Eintrag ${index + 1} in „${name}“.`, {
          cause: geprueft.error,
        });
      }
      return geprueft.data;
    });
    return { name, zeilen };
  });

  const einsatzIds = new Set(datei.einsaetze.map((e) => e.id));
  for (const { name, zeilen } of zeilenJeTabelle) {
    const fremd = zeilen.find((z) => !einsatzIds.has(z.einsatzId));
    if (fremd) throw new ImportFehler(`Eintrag in „${name}“ gehört zu keinem Einsatz der Datei.`);
  }

  const ergebnis: ImportErgebnis = {
    einsaetzeNeu: 0,
    einsaetzeAktualisiert: 0,
    einsaetzeUnveraendert: 0,
    zeilenNeu: 0,
    zeilenVorhanden: 0,
    unbekannteTabellen,
  };

  const tabellen = zeilenJeTabelle.map(({ name }) => db.table(name));
  await db.transaction("rw", [db.einsaetze, ...tabellen], async () => {
    for (const einsatz of datei.einsaetze) {
      const vorhanden = await db.einsaetze.get(einsatz.id);
      if (!vorhanden) {
        await db.einsaetze.add(einsatz);
        ergebnis.einsaetzeNeu++;
      } else if (einsatz.geaendertAm > vorhanden.geaendertAm) {
        await db.einsaetze.put(einsatz);
        ergebnis.einsaetzeAktualisiert++;
      } else {
        ergebnis.einsaetzeUnveraendert++;
      }
    }
    for (const { name, zeilen } of zeilenJeTabelle) {
      const tabelle = db.table(name);
      const vorhandeneIds = new Set(
        (await tabelle.bulkGet(zeilen.map((z) => z.id))).filter(Boolean).map((z) => z.id),
      );
      const neu = zeilen.filter((z) => !vorhandeneIds.has(z.id));
      await tabelle.bulkAdd(neu);
      ergebnis.zeilenNeu += neu.length;
      ergebnis.zeilenVorhanden += zeilen.length - neu.length;
    }
  });

  return ergebnis;
}

/** Dateiname wie `lagekit-2026-11-14-abc-2.json`. */
export function exportDateiname(einsaetze: Einsatz[], jetzt: Date = new Date()): string {
  const datum = jetzt.toISOString().slice(0, 10);
  const teil =
    einsaetze.length === 1 ? einsaetze[0].stichwort : einsaetze.length === 0 ? "leer" : "alle";
  return `lagekit-${datum}-${dateinamenTeil(teil)}.json`;
}

export function dateinamenTeil(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "einsatz"
  );
}
