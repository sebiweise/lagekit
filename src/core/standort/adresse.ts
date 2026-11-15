import { z } from "zod";
import type { Koordinaten } from "./standort";

/**
 * Adressen über den öffentlichen Nominatim-Dienst von OpenStreetMap.
 *
 * Nutzungsregeln (https://operations.osmfoundation.org/policies/nominatim/):
 * höchstens 1 Anfrage pro Sekunde, nur auf Knopfdruck (keine Autovervollständigung),
 * Ergebnisse zwischenspeichern, Quelle nennen. Der Browser schickt den Referer mit,
 * der die App kenntlich macht. Ohne Netz gibt es keine Adresse, die Koordinaten bleiben.
 */
export const NOMINATIM = "https://nominatim.openstreetmap.org";

const adresseSchema = z
  .object({
    road: z.string().optional(),
    pedestrian: z.string().optional(),
    footway: z.string().optional(),
    path: z.string().optional(),
    house_number: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
    hamlet: z.string().optional(),
    suburb: z.string().optional(),
    municipality: z.string().optional(),
  })
  .partial();

const ergebnisSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  display_name: z.string(),
  address: adresseSchema.optional(),
});

export interface Fundstelle {
  lat: number;
  lon: number;
  /** Kurz: „Straße Nr, PLZ Ort“. */
  text: string;
  /** Lange Bezeichnung von OpenStreetMap. */
  lang: string;
}

/** Baut aus den Adressteilen eine kurze, im Einsatz übliche Form. */
export function adresseKurz(a: z.infer<typeof adresseSchema> | undefined, ersatz: string): string {
  if (!a) return ersatz;
  const strasse = a.road ?? a.pedestrian ?? a.footway ?? a.path;
  const ort = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet;
  const teil1 = [strasse, a.house_number].filter(Boolean).join(" ");
  const teil2 = [a.postcode, ort].filter(Boolean).join(" ");
  const ortsteil = a.suburb && ort && a.suburb !== ort ? ` (${a.suburb})` : "";
  const text = [teil1, teil2 + ortsteil].filter(Boolean).join(", ");
  return text || ersatz;
}

function fundstelle(r: z.infer<typeof ergebnisSchema>): Fundstelle {
  return { lat: r.lat, lon: r.lon, text: adresseKurz(r.address, r.display_name), lang: r.display_name };
}

// Höchstens eine Anfrage pro Sekunde, gleiche Anfragen aus dem Zwischenspeicher.
let naechsteFrei = 0;
const zwischenspeicher = new Map<string, Promise<unknown>>();

async function abfragen(pfad: string, holen: typeof fetch): Promise<unknown> {
  const url = `${NOMINATIM}${pfad}`;
  const vorhanden = zwischenspeicher.get(url);
  if (vorhanden) return vorhanden;
  const anfrage = (async () => {
    const warten = naechsteFrei - Date.now();
    naechsteFrei = Math.max(Date.now(), naechsteFrei) + 1_100;
    if (warten > 0) await new Promise((r) => setTimeout(r, warten));
    const antwort = await holen(url, { headers: { Accept: "application/json" } });
    if (!antwort.ok) throw new Error(`Adressdienst antwortet mit ${antwort.status}`);
    return antwort.json();
  })();
  zwischenspeicher.set(url, anfrage);
  anfrage.catch(() => zwischenspeicher.delete(url));
  return anfrage;
}

/** Adresse zu Koordinaten (Rückwärtssuche). `null`, wenn dort keine Adresse bekannt ist. */
export async function adresseZuKoordinaten(
  k: Pick<Koordinaten, "lat" | "lon">,
  holen: typeof fetch = fetch,
): Promise<Fundstelle | null> {
  // Auf ca. 1 m runden: genauer misst kein GPS, und der Zwischenspeicher greift öfter.
  const lat = k.lat.toFixed(5);
  const lon = k.lon.toFixed(5);
  const json = await abfragen(
    `/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=de`,
    holen,
  );
  const r = ergebnisSchema.safeParse(json);
  return r.success ? fundstelle(r.data) : null;
}

/** Sucht eine Adresse oder einen Ort (nur auf Knopfdruck, nie beim Tippen). */
export async function adresseSuchen(text: string, holen: typeof fetch = fetch): Promise<Fundstelle[]> {
  const q = text.trim();
  if (!q) return [];
  const json = await abfragen(
    `/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=de,at,ch,lu,nl,be,fr,dk,pl,cz&accept-language=de`,
    holen,
  );
  const r = z.array(ergebnisSchema).safeParse(json);
  return r.success ? r.data.map(fundstelle) : [];
}

/** Nur für Tests: Zwischenspeicher und Taktung zurücksetzen. */
export function _adresseZuruecksetzen() {
  naechsteFrei = 0;
  zwischenspeicher.clear();
}
