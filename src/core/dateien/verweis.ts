import type { LagekitDB } from "@/core/db/db";
import { zugriffAnfragen, zugriffPruefen, type DateiInfo, type OrdnerHandle } from "./ordner";
import { ordnerDesEinsatzes, type VerknuepfterOrdner } from "./repository";

/**
 * Verweise auf Dateien in verknüpften Ordnern, z. B. im Einsatztagebuch:
 * `[[Drohne/Flug1/DJI_0001.JPG]]`. Der erste Teil ist der Ordnername. Der
 * Verweis ist reiner Text und bleibt so in Druck, CSV und Sicherung lesbar.
 */
const VERWEIS = /\[\[([^\]\n]+)\]\]/g;

export function verweisText(ordner: string, pfad: string): string {
  return `[[${ordner}/${pfad}]]`;
}

export type TextTeil = { art: "text"; text: string } | { art: "verweis"; ordner: string; pfad: string; text: string };

/** Zerlegt einen Text in normalen Text und Dateiverweise. */
export function verweiseZerlegen(text: string): TextTeil[] {
  const teile: TextTeil[] = [];
  let pos = 0;
  for (const treffer of text.matchAll(VERWEIS)) {
    const ziel = treffer[1].trim();
    const schnitt = ziel.indexOf("/");
    if (schnitt <= 0 || schnitt === ziel.length - 1) continue;
    if (treffer.index > pos) teile.push({ art: "text", text: text.slice(pos, treffer.index) });
    teile.push({ art: "verweis", ordner: ziel.slice(0, schnitt), pfad: ziel.slice(schnitt + 1), text: treffer[0] });
    pos = treffer.index + treffer[0].length;
  }
  if (pos < text.length) teile.push({ art: "text", text: text.slice(pos) });
  return teile;
}

export interface DateiTreffer extends DateiInfo {
  ordner: string;
}

/**
 * Dateien für die Auswahl beim Tippen von „/“: Alle Wörter der Suche müssen im
 * Pfad vorkommen, neueste zuerst.
 */
export function dateienFiltern(ordner: Pick<VerknuepfterOrdner, "name" | "dateien">[], suche: string, max = 8): DateiTreffer[] {
  const woerter = suche.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  return ordner
    .flatMap((o) => o.dateien.map((d) => ({ ...d, ordner: o.name })))
    .filter((d) => {
      const text = `${d.ordner}/${d.pfad}`.toLocaleLowerCase("de");
      return woerter.every((w) => text.includes(w));
    })
    .sort((a, b) => b.geaendert - a.geaendert)
    .slice(0, max);
}

export class DateiFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DateiFehler";
  }
}

async function kind(ordner: OrdnerHandle, name: string, art: "file" | "directory") {
  if (art === "directory" && ordner.getDirectoryHandle) return ordner.getDirectoryHandle(name);
  if (art === "file" && ordner.getFileHandle) return ordner.getFileHandle(name);
  for await (const e of ordner.values()) if (e.name === name && e.kind === art) return e;
  throw new DOMException("nicht gefunden", "NotFoundError");
}

/**
 * Liest eine Datei aus einem verknüpften Ordner des Einsatzes. Nur aus einem
 * Klick heraus aufrufen: Fehlt die Erlaubnis, fragt der Browser nach.
 */
export async function dateiLesen(db: LagekitDB, einsatzId: string, ordnerName: string, pfad: string): Promise<File> {
  const ordner = (await ordnerDesEinsatzes(db, einsatzId)).find((o) => o.name === ordnerName);
  if (!ordner) throw new DateiFehler(`Der Ordner „${ordnerName}“ ist auf diesem Gerät nicht verknüpft.`);
  let zugriff = await zugriffPruefen(ordner.handle);
  if (zugriff === "fragen") zugriff = await zugriffAnfragen(ordner.handle);
  if (zugriff !== "erlaubt") throw new DateiFehler(`Kein Zugriff auf den Ordner „${ordnerName}“.`);
  try {
    const teile = pfad.split("/");
    let aktuell: OrdnerHandle = ordner.handle;
    for (const teil of teile.slice(0, -1)) aktuell = (await kind(aktuell, teil, "directory")) as OrdnerHandle;
    const datei = await kind(aktuell, teile.at(-1)!, "file");
    return await (datei as { getFile(): Promise<File> }).getFile();
  } catch {
    throw new DateiFehler(`„${pfad}“ gibt es im Ordner „${ordnerName}“ nicht mehr.`);
  }
}
