/**
 * ZIP-Archiv im Browser, ohne Server und ohne Bibliothek.
 *
 * Dateien werden unkomprimiert abgelegt („stored“): Fotos und Videos sind
 * ohnehin komprimiert, und so bleibt das Archiv auch bei großen Drohnenaufnahmen
 * schnell. Der Inhalt wird nicht in den Speicher kopiert: Das Ergebnis ist ein
 * Blob aus Kopfdaten und den Original-Dateien. Nur die Prüfsumme (CRC-32) liest
 * jede Datei einmal stückweise.
 *
 * Grenzen des einfachen ZIP-Formats: je Datei und insgesamt unter 4 GB,
 * höchstens 65 535 Dateien. Darüber gibt es einen `ZipFehler`.
 */
export interface ZipEintrag {
  /** Pfad im Archiv mit `/` als Trenner, z. B. `dateien/Drohne/DJI_0001.JPG`. */
  pfad: string;
  inhalt: Blob | string;
  geaendert?: Date;
}

export class ZipFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipFehler";
  }
}

const GRENZE = 0xffff_ffff;
const MAX_EINTRAEGE = 0xffff;

const CRC_TABELLE = (() => {
  const tabelle = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c >>> 0;
  }
  return tabelle;
})();

/** Laufende CRC-32; Startwert 0, Ergebnis vorzeichenlos. */
export function crc32(daten: Uint8Array, crc = 0): number {
  let c = (crc ^ 0xffff_ffff) >>> 0;
  for (let i = 0; i < daten.length; i++) c = CRC_TABELLE[(c ^ daten[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffff_ffff) >>> 0;
}

async function blobCrc32(blob: Blob, gelesen: (bytes: number) => void): Promise<number> {
  let crc = 0;
  const leser = blob.stream().getReader();
  for (;;) {
    const { done, value } = await leser.read();
    if (done) return crc;
    crc = crc32(value, crc);
    gelesen(value.length);
  }
}

/** DOS-Zeit und -Datum in Ortszeit, wie sie Explorer und Finder anzeigen. */
function dosZeit(d: Date): { zeit: number; datum: number } {
  const jahr = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  return {
    zeit: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    datum: ((jahr - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * Macht aus einem beliebigen Pfad einen sicheren Archivpfad: keine absoluten
 * Pfade, kein `..`, keine Zeichen, die Windows beim Entpacken ablehnt.
 */
export function zipPfad(pfad: string): string {
  const teile = pfad
    .replace(/\\/g, "/")
    .split("/")
    .map((t) =>
      t
        .replace(/[<>:"|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/, "")
        .trim(),
    )
    .filter((t) => t !== "" && t !== "." && t !== "..");
  return teile.join("/") || "datei";
}

/** Hängt bei doppelten Pfaden „ (2)“, „ (3)“ … vor der Endung an. */
function eindeutig(pfad: string, vergeben: Set<string>): string {
  let kandidat = pfad;
  for (let n = 2; vergeben.has(kandidat.toLowerCase()); n++) {
    const punkt = pfad.lastIndexOf(".");
    const schnitt = punkt > pfad.lastIndexOf("/") + 1 ? punkt : pfad.length;
    kandidat = `${pfad.slice(0, schnitt)} (${n})${pfad.slice(schnitt)}`;
  }
  vergeben.add(kandidat.toLowerCase());
  return kandidat;
}

export interface ZipOptionen {
  /** Fortschritt von 0 bis 1, während die Prüfsummen berechnet werden. */
  fortschritt?: (anteil: number) => void;
  jetzt?: Date;
}

export async function zipErstellen(eintraege: ZipEintrag[], optionen: ZipOptionen = {}): Promise<Blob> {
  const { fortschritt, jetzt = new Date() } = optionen;
  if (eintraege.length > MAX_EINTRAEGE) {
    throw new ZipFehler(`Zu viele Dateien (${eintraege.length}). Höchstens ${MAX_EINTRAEGE} passen in ein ZIP.`);
  }
  const encoder = new TextEncoder();
  const blobs = eintraege.map((e) =>
    typeof e.inhalt === "string" ? new Blob([e.inhalt], { type: "text/plain" }) : e.inhalt,
  );
  const gesamt = blobs.reduce((s, b) => s + b.size, 0);
  const zuGross = blobs.findIndex((b) => b.size >= GRENZE);
  if (zuGross >= 0) {
    throw new ZipFehler(`„${eintraege[zuGross].pfad}“ ist größer als 4 GB und passt nicht in ein ZIP.`);
  }

  const teile: BlobPart[] = [];
  const zentral: Uint8Array<ArrayBuffer>[] = [];
  const vergeben = new Set<string>();
  let versatz = 0;
  let gelesen = 0;
  fortschritt?.(0);

  for (let i = 0; i < eintraege.length; i++) {
    const blob = blobs[i];
    const name = encoder.encode(eindeutig(zipPfad(eintraege[i].pfad), vergeben));
    const crc = await blobCrc32(blob, (n) => {
      gelesen += n;
      if (gesamt > 0) fortschritt?.(gelesen / gesamt);
    });
    const { zeit, datum } = dosZeit(eintraege[i].geaendert ?? jetzt);

    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true);
    lokal.setUint16(4, 20, true); // benötigte Version 2.0
    lokal.setUint16(6, 0x0800, true); // Dateinamen in UTF-8
    lokal.setUint16(8, 0, true); // stored
    lokal.setUint16(10, zeit, true);
    lokal.setUint16(12, datum, true);
    lokal.setUint32(14, crc, true);
    lokal.setUint32(18, blob.size, true);
    lokal.setUint32(22, blob.size, true);
    lokal.setUint16(26, name.length, true);
    lokal.setUint16(28, 0, true);

    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(4, 0x0314, true); // erstellt mit 2.0, Unix-Attribute
    z.setUint16(6, 20, true);
    z.setUint16(8, 0x0800, true);
    z.setUint16(10, 0, true);
    z.setUint16(12, zeit, true);
    z.setUint16(14, datum, true);
    z.setUint32(16, crc, true);
    z.setUint32(20, blob.size, true);
    z.setUint32(24, blob.size, true);
    z.setUint16(28, name.length, true);
    z.setUint32(38, (0o100644 << 16) >>> 0, true); // normale Datei, rw-r--r--
    z.setUint32(42, versatz, true);

    const kopf = new Uint8Array(30 + name.length);
    kopf.set(new Uint8Array(lokal.buffer), 0);
    kopf.set(name, 30);
    teile.push(kopf, blob);

    const eintrag = new Uint8Array(46 + name.length);
    eintrag.set(new Uint8Array(z.buffer), 0);
    eintrag.set(name, 46);
    zentral.push(eintrag);

    versatz += kopf.length + blob.size;
    if (versatz >= GRENZE) throw new ZipFehler("Zusammen sind die Dateien größer als 4 GB. Bitte weniger Dateien mitnehmen.");
  }

  const zentralGroesse = zentral.reduce((s, z) => s + z.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, eintraege.length, true);
  ende.setUint16(10, eintraege.length, true);
  ende.setUint32(12, zentralGroesse, true);
  ende.setUint32(16, versatz, true);

  fortschritt?.(1);
  return new Blob([...teile, ...zentral, new Uint8Array(ende.buffer)], { type: "application/zip" });
}
