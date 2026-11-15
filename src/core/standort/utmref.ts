/**
 * Umrechnung von WGS84-Koordinaten in UTMREF (MGRS), das Meldesystem der BOS,
 * z. B. „32U NB 12345 67890“. Genauigkeit: 1 m, gültig zwischen 80° S und 84° N.
 */

const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

const BAENDER = "CDEFGHJKLMNPQRSTUVWX";
const SPALTEN = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const ZEILEN = "ABCDEFGHJKLMNPQRSTUV";

export interface Utm {
  zone: number;
  band: string;
  ost: number;
  nord: number;
}

function zoneVon(lat: number, lon: number): number {
  let zone = Math.floor((lon + 180) / 6) + 1;
  if (zone > 60) zone = 60;
  // Ausnahmen für Südnorwegen und Spitzbergen.
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
  if (lat >= 72 && lat < 84) {
    if (lon >= 0 && lon < 9) zone = 31;
    else if (lon >= 9 && lon < 21) zone = 33;
    else if (lon >= 21 && lon < 33) zone = 35;
    else if (lon >= 33 && lon < 42) zone = 37;
  }
  return zone;
}

export function utm(lat: number, lon: number): Utm | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84) return null;
  const zone = zoneVon(lat, lon);
  const phi = (lat * Math.PI) / 180;
  const lambda0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;

  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);
  const n = A / Math.sqrt(1 - E2 * sin * sin);
  const t = tan * tan;
  const c = EP2 * cos * cos;
  const a = cos * (lambda - lambda0);
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const m =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));

  const ost =
    K0 *
      n *
      (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120) +
    500000;
  let nord =
    K0 *
    (m +
      n *
        tan *
        ((a * a) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));
  if (lat < 0) nord += 10_000_000;
  const band = BAENDER[Math.min(Math.floor((lat + 80) / 8), BAENDER.length - 1)];
  return { zone, band, ost, nord };
}

/** UTMREF mit 1 m Auflösung, z. B. „32U NB 12345 67890“. */
export function utmref(lat: number, lon: number): string | null {
  const u = utm(lat, lon);
  if (!u) return null;
  const satz = ((u.zone - 1) % 6) + 1;
  const spalte = SPALTEN[(satz - 1) % 3][Math.floor(u.ost / 100_000) - 1];
  const zeile = ZEILEN[(Math.floor(u.nord / 100_000) + (satz % 2 === 0 ? 5 : 0)) % 20];
  if (!spalte || !zeile) return null;
  const ost = String(Math.floor(u.ost % 100_000)).padStart(5, "0");
  const nord = String(Math.floor(u.nord % 100_000)).padStart(5, "0");
  return `${u.zone}${u.band} ${spalte}${zeile} ${ost} ${nord}`;
}
