"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { csvHerunterladen } from "@/core/export/download";
import { cn } from "@/lib/utils";
import { tagebuchCsv, tagebuchCsvDateiname } from "../export";
import { useEintraege, useVerfasser } from "../hooks";
import { filtern, korrekturen } from "../logic";
import { EINTRAG_ARTEN, type Eintrag, type EintragArt } from "../schema";
import { EintragListe } from "./eintrag-liste";
import { Schnellerfassung } from "./schnellerfassung";

export function Einsatztagebuch() {
  const einsatz = useAktiverEinsatz();
  const eintraege = useEintraege(einsatz?.id);
  const verfasser = useVerfasser();
  const [arten, setArten] = useState<Set<EintragArt>>(new Set());
  const [suche, setSuche] = useState("");
  const [korrektur, setKorrektur] = useState<Eintrag | null>(null);
  const suchfeld = useRef<HTMLInputElement>(null);

  // „/“ springt zur Suche, außer beim Tippen in einem Feld.
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      const ziel = e.target as HTMLElement | null;
      if (e.key === "/" && !ziel?.closest("input, textarea, select")) {
        e.preventDefault();
        suchfeld.current?.focus();
      }
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, []);

  if (einsatz === undefined || verfasser === undefined) return null;
  if (einsatz === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kein Einsatz aktiv</CardTitle>
          <CardDescription>Das Tagebuch gehört immer zu einem Einsatz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/einsatz/" className={buttonVariants()}>
            Einsatz anlegen oder auswählen
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (!eintraege) return null;

  const alle = new Map(eintraege.map((e) => [e.id, e]));
  const korrigiertDurch = korrekturen(eintraege);
  const sichtbar = filtern(eintraege, { arten, suche });

  return (
    <div className="flex flex-col gap-5">
      <Card className="py-4">
        <CardContent>
          <Schnellerfassung
            einsatzId={einsatz.id}
            verfasserGespeichert={verfasser}
            korrektur={korrektur}
            onKorrekturEnde={() => setKorrektur(null)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            className="-mx-4 w-auto overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            aria-label="Nach Art filtern"
            value={[...arten]}
            onValueChange={(wert) => setArten(new Set(wert as EintragArt[]))}
          >
            {EINTRAG_ARTEN.map((art) => (
              <ToggleGroupItem key={art} value={art} className="rounded-full">
                {art}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="relative w-full lg:ml-auto lg:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={suchfeld}
              type="search"
              aria-label="Tagebuch durchsuchen"
              placeholder="Suchen (/)"
              className="h-11 pl-10"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {sichtbar.length === eintraege.length
            ? `${eintraege.length} Einträge`
            : `${sichtbar.length} von ${eintraege.length} Einträgen`}
        </p>
      </div>

      {eintraege.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
          Noch keine Einträge. Text in die Zeile oben tippen und Enter drücken.
        </p>
      ) : (
        <EintragListe
          eintraege={sichtbar}
          alle={alle}
          korrigiertDurch={korrigiertDurch}
          onKorrigieren={(e) => {
            setKorrektur(e);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      <div className={cn("flex flex-wrap gap-3", eintraege.length === 0 && "hidden")}>
        <Link href="/app/tools/einsatztagebuch/druck/" className={buttonVariants({ variant: "outline" })}>
          <Printer /> Tagebuch drucken (PDF)
        </Link>
        <Button variant="outline" onClick={() => csvHerunterladen(tagebuchCsvDateiname(einsatz), tagebuchCsv(eintraege))}>
          <Download /> Tagebuch als CSV
        </Button>
      </div>
    </div>
  );
}
