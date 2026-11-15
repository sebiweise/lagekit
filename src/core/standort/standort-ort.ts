import { adresseZuKoordinaten } from "./adresse";
import { koordinatenText, standortBestimmen, type Koordinaten } from "./standort";

export interface OrtErgebnis {
  /** Text für das Feld „Ort“: Adresse, sonst Koordinaten. */
  ort: string;
  koordinaten: Koordinaten;
  /** Woher der Text stammt. */
  quelle: "adresse" | "koordinaten";
}

/** Ort aus Koordinaten: mit Netz als Adresse, ohne Netz (oder ohne Treffer) als Koordinaten. */
export async function ortZuKoordinaten(koordinaten: Koordinaten): Promise<OrtErgebnis> {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (online) {
    try {
      const adresse = await adresseZuKoordinaten(koordinaten);
      if (adresse) return { ort: adresse.text, koordinaten, quelle: "adresse" };
    } catch {
      // Adressdienst nicht erreichbar: Koordinaten reichen.
    }
  }
  return { ort: koordinatenText(koordinaten), koordinaten, quelle: "koordinaten" };
}

/** Eigener Standort als Einsatzort. */
export async function ortAusStandort(): Promise<OrtErgebnis> {
  return ortZuKoordinaten(await standortBestimmen());
}
