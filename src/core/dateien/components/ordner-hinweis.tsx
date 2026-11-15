"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { ordnerAuswahlMoeglich } from "../ordner";
import { neueGesehen, ordnerDesEinsatzes } from "../repository";
import { ueberwachungStarten, useZugriffe, zugriffErlauben } from "../ueberwachung";

export const EXPORT_PFAD = "/export/";

/**
 * Auf allen Seiten: prüft die verknüpften Ordner des aktiven Einsatzes und
 * meldet neue Dateien oder einen fehlenden Zugriff in einer schmalen Leiste.
 */
export function OrdnerHinweis() {
  const pfad = usePathname();
  const einsatz = useAktiverEinsatz();
  const ordner = useLiveQuery(
    async () => (einsatz ? ordnerDesEinsatzes(getDb(), einsatz.id) : []),
    [einsatz?.id],
  );
  const zugriffe = useZugriffe();
  const vorhanden = (ordner?.length ?? 0) > 0;

  useEffect(() => {
    if (!vorhanden || !ordnerAuswahlMoeglich()) return;
    return ueberwachungStarten(getDb());
  }, [vorhanden]);

  if (!ordner || !vorhanden || pfad === EXPORT_PFAD || pfad === "/tools/dateien/") return null;

  const mitNeuen = ordner.filter((o) => o.neu.length > 0);
  const ohneZugriff = ordner.filter((o) => zugriffe.get(o.id) === "fragen");
  if (mitNeuen.length === 0 && ohneZugriff.length === 0) return null;

  return (
    <div className="border-b border-primary/40 bg-primary/5 print:hidden" role="status" data-testid="ordner-hinweis">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-sm sm:px-6">
        <FolderOpen className="size-4 shrink-0" aria-hidden />
        {mitNeuen.length > 0 && (
          <span className="font-medium">
            Neue Dateien:{" "}
            {mitNeuen.map((o) => `${o.neu.length} in „${o.name}“`).join(", ")}
          </span>
        )}
        {ohneZugriff.map((o) => (
          <Button
            key={o.id}
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void zugriffErlauben(getDb(), o)}
          >
            „{o.name}“ wieder überwachen
          </Button>
        ))}
        <Link href="/tools/dateien/" className="font-medium underline underline-offset-4 hover:text-foreground">
          Ansehen
        </Link>
        {mitNeuen.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 px-2"
            aria-label="Hinweis auf neue Dateien schließen"
            onClick={() => void Promise.all(mitNeuen.map((o) => neueGesehen(getDb(), o.id)))}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
