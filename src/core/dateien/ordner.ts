/**
 * Verknüpfte Ordner auf dem Gerät, z. B. Drohnenaufnahmen oder Fotos.
 *
 * Grundlage ist die File System Access API (`showDirectoryPicker`). Sie gibt es
 * nur in Chrome und Edge am PC. Der Zugriff bleibt über einen Handle in der
 * lokalen Datenbank gespeichert; der Browser fragt nach einem Neustart je nach
 * Einstellung erneut nach der Erlaubnis.
 *
 * Verknüpfte Ordner gehören zum Gerät: Sie werden weder in der Sicherung noch
 * beim gemeinsamen Arbeiten übertragen. Ihre Dateien kommen in den ZIP-Export.
 */

/** Die Teile von `FileSystemFileHandle`, die Lagekit braucht. */
export interface DateiHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

/** Die Teile von `FileSystemDirectoryHandle`, die Lagekit braucht. */
export interface OrdnerHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<DateiHandle | OrdnerHandle>;
  getDirectoryHandle?(name: string): Promise<OrdnerHandle>;
  getFileHandle?(name: string): Promise<DateiHandle>;
  queryPermission?(beschreibung: { mode: "read" }): Promise<PermissionState>;
  requestPermission?(beschreibung: { mode: "read" }): Promise<PermissionState>;
}

export interface DateiInfo {
  /** Pfad relativ zum Ordner, mit `/`. */
  pfad: string;
  groesse: number;
  /** Letzte Änderung in Millisekunden seit 1970. */
  geaendert: number;
}

export interface GefundeneDatei extends DateiInfo {
  datei: File;
}

export interface Durchsuchung {
  dateien: GefundeneDatei[];
  /** Mehr Dateien oder tiefere Ordner als die Grenzen erlauben; Rest fehlt. */
  abgeschnitten: boolean;
}

/** Systemdateien, die niemand im Export braucht. */
const IGNORIEREN = /^(\.|~\$|thumbs\.db$|desktop\.ini$)/i;

export function ordnerAuswahlMoeglich(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Fragt den Ordner beim Benutzer ab; `null`, wenn abgebrochen. */
export async function ordnerAuswaehlen(): Promise<OrdnerHandle | null> {
  const auswahl = (window as unknown as { showDirectoryPicker(o: object): Promise<OrdnerHandle> }).showDirectoryPicker;
  try {
    return await auswahl.call(window, { id: "lagekit-ordner", mode: "read" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

export type Zugriff = "erlaubt" | "fragen" | "verweigert";

function zugriffAus(zustand: PermissionState): Zugriff {
  return zustand === "granted" ? "erlaubt" : zustand === "denied" ? "verweigert" : "fragen";
}

export async function zugriffPruefen(handle: OrdnerHandle): Promise<Zugriff> {
  if (!handle.queryPermission) return "erlaubt";
  return zugriffAus(await handle.queryPermission({ mode: "read" }));
}

/** Nur aus einem Klick heraus aufrufen, sonst lehnt der Browser ab. */
export async function zugriffAnfragen(handle: OrdnerHandle): Promise<Zugriff> {
  if (!handle.requestPermission) return "erlaubt";
  return zugriffAus(await handle.requestPermission({ mode: "read" }));
}

/** Liest alle Dateien des Ordners samt Unterordnern, sortiert nach Pfad. */
export async function ordnerDurchsuchen(
  handle: OrdnerHandle,
  grenzen: { maxDateien?: number; maxTiefe?: number } = {},
): Promise<Durchsuchung> {
  const { maxDateien = 5000, maxTiefe = 6 } = grenzen;
  const dateien: GefundeneDatei[] = [];
  let abgeschnitten = false;

  async function lesen(ordner: OrdnerHandle, praefix: string, tiefe: number) {
    for await (const eintrag of ordner.values()) {
      if (IGNORIEREN.test(eintrag.name)) continue;
      if (eintrag.kind === "directory") {
        if (tiefe >= maxTiefe) abgeschnitten = true;
        else await lesen(eintrag, `${praefix}${eintrag.name}/`, tiefe + 1);
      } else {
        if (dateien.length >= maxDateien) {
          abgeschnitten = true;
          return;
        }
        const datei = await eintrag.getFile();
        dateien.push({ pfad: praefix + eintrag.name, groesse: datei.size, geaendert: datei.lastModified, datei });
      }
    }
  }

  await lesen(handle, "", 0);
  dateien.sort((a, b) => a.pfad.localeCompare(b.pfad, "de"));
  return { dateien, abgeschnitten };
}

export interface Unterschied {
  /** Neu aufgetaucht oder geändert (Größe oder Zeitstempel). */
  neu: string[];
  entfernt: string[];
}

export function vergleichen(alt: DateiInfo[], jetzt: DateiInfo[]): Unterschied {
  const vorher = new Map(alt.map((d) => [d.pfad, d]));
  const nachher = new Set(jetzt.map((d) => d.pfad));
  return {
    neu: jetzt
      .filter((d) => {
        const v = vorher.get(d.pfad);
        return !v || v.groesse !== d.groesse || v.geaendert !== d.geaendert;
      })
      .map((d) => d.pfad),
    entfernt: alt.filter((d) => !nachher.has(d.pfad)).map((d) => d.pfad),
  };
}

export function groesseText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const einheiten = ["KB", "MB", "GB"];
  let wert = bytes / 1024;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) {
    wert /= 1024;
    i++;
  }
  return `${wert.toLocaleString("de-DE", { maximumFractionDigits: wert < 10 ? 1 : 0 })} ${einheiten[i]}`;
}
