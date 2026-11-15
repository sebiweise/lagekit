import { z } from "zod";

/** Ein Punkt in WGS84 (Grad), wie ihn GPS und OpenStreetMap verwenden. */
export const koordinatenSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Genauigkeit in Metern, falls vom Gerät gemeldet. */
  genauigkeit: z.number().nonnegative().optional(),
});
export type Koordinaten = z.infer<typeof koordinatenSchema>;

export class StandortFehler extends Error {}

/** Ermittelt den eigenen Standort einmalig (GPS bzw. Ortungsdienste des Geräts). */
export function standortBestimmen(): Promise<Koordinaten> {
  return new Promise((ok, fehler) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fehler(new StandortFehler("Dieses Gerät kann den Standort nicht bestimmen."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, genauigkeit: Math.round(p.coords.accuracy) }),
      (e) => fehler(new StandortFehler(standortMeldung(e))),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  });
}

export function standortMeldung(e: GeolocationPositionError): string {
  switch (e.code) {
    case e.PERMISSION_DENIED:
      return "Standort nicht freigegeben. In den Einstellungen des Geräts bzw. Browsers den Standortzugriff für Lagekit erlauben.";
    case e.POSITION_UNAVAILABLE:
      return "Standort nicht verfügbar (kein GPS-Empfang?).";
    case e.TIMEOUT:
      return "Standort nicht rechtzeitig gefunden. Bitte erneut versuchen, möglichst unter freiem Himmel.";
    default:
      return "Standort konnte nicht bestimmt werden.";
  }
}

/** Kurze Koordinatenangabe, z. B. „51.31270, 9.47970“ (Reihenfolge Breite, Länge). */
export function koordinatenText(k: Pick<Koordinaten, "lat" | "lon">): string {
  return `${k.lat.toFixed(5)}, ${k.lon.toFixed(5)}`;
}

/** Entfernung zweier Punkte in Metern (Großkreis, genügt für Einsatzentfernungen). */
export function entfernungMeter(a: Pick<Koordinaten, "lat" | "lon">, b: Pick<Koordinaten, "lat" | "lon">): number {
  const r = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** Richtung von a nach b in Grad (0 = Nord, im Uhrzeigersinn). */
export function richtungGrad(a: Pick<Koordinaten, "lat" | "lon">, b: Pick<Koordinaten, "lat" | "lon">): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * rad) * Math.cos(b.lat * rad);
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

const HIMMELSRICHTUNGEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

/** z. B. „350 m NO“ oder „2,4 km S“. */
export function entfernungText(a: Pick<Koordinaten, "lat" | "lon">, b: Pick<Koordinaten, "lat" | "lon">): string {
  const m = entfernungMeter(a, b);
  const weite = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
  return `${weite} ${HIMMELSRICHTUNGEN[Math.round(richtungGrad(a, b) / 45) % 8]}`;
}
