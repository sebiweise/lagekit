"use client";

import { useState } from "react";
import { LoaderCircle, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ortAusStandort, type OrtErgebnis } from "../standort-ort";

/**
 * Übernimmt den eigenen Standort als Ort: mit Netz als Adresse (OpenStreetMap),
 * ohne Netz als Koordinaten. Fragt erst beim Antippen nach der Standortfreigabe.
 */
export function StandortKnopf({
  onErgebnis,
  onFehler,
  beschriftung = "Standort",
}: {
  onErgebnis: (e: OrtErgebnis) => void;
  /** Fehlertext (oder `null` beim neuen Versuch); die Seite zeigt ihn unter dem Feld. */
  onFehler: (fehler: string | null) => void;
  beschriftung?: string;
}) {
  const [laeuft, setLaeuft] = useState(false);
  const setFehler = onFehler;

  async function bestimmen() {
    setLaeuft(true);
    setFehler(null);
    try {
      onErgebnis(await ortAusStandort());
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void bestimmen()}
      disabled={laeuft}
      aria-label="Eigenen Standort als Ort übernehmen"
      data-testid="standort-knopf"
    >
      {laeuft ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
      <span className="hidden sm:inline">
        {laeuft ? "Suche …" : beschriftung}
      </span>
    </Button>
  );
}
