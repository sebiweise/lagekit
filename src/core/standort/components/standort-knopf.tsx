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
  beschriftung = "Standort",
}: {
  onErgebnis: (e: OrtErgebnis) => void;
  beschriftung?: string;
}) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

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
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void bestimmen()}
        disabled={laeuft}
        aria-label="Eigenen Standort als Ort übernehmen"
        data-testid="standort-knopf"
      >
        {laeuft ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
        <span className="hidden sm:inline">{laeuft ? "Suche …" : beschriftung}</span>
      </Button>
      {fehler && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {fehler}
        </p>
      )}
    </>
  );
}
