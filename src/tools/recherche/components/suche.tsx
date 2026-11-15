"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleZeile } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { useSuchverlauf } from "../hooks";
import { externeTools } from "../katalog";
import { direktHinweis, nutztOrt, suchUrl, suchziele, type BegriffArt } from "../logic";
import { kopieren, Liste, OfflineHinweis, sucheMerken, Suchverlauf, ZielZeile } from "./teile";

const ERKANNT: Record<Exclude<BegriffArt, "text">, string> = {
  un: "UN-Nummer",
  cas: "CAS-Nummer",
};

/** Universalsuche: ein Feld, die passenden Ziele als große Zeilen, darunter der Verlauf. */
export function Universalsuche() {
  const einsatz = useAktiverEinsatz();
  const verlauf = useSuchverlauf(einsatz?.id);
  const [begriff, setBegriff] = useState("");
  // `null`: Ort des Einsatzes übernehmen, bis selbst etwas eingetragen wird.
  const [ortEingabe, setOrtEingabe] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);

  if (einsatz === undefined) return null;
  const ort = ortEingabe ?? einsatz?.ort ?? "";
  const ziele = suchziele(externeTools, begriff, einsatz);
  const hatBegriff = ziele.wert !== "";
  // Bei UN-/CAS-Nummern spielt der Ort keine Rolle.
  const ortFuerSuche = ziele.art === "text" ? ort : "";

  return (
    <div className="flex flex-col gap-6">
      <OfflineHinweis />

      <form
        role="search"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          (e.currentTarget.querySelector("[data-testid=suchziel]") as HTMLElement | null)?.focus();
        }}
      >
        <Label htmlFor="suche-begriff" className="sr-only">
          Suchbegriff
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="suche-begriff"
            type="search"
            enterKeyHint="search"
            autoFocus
            value={begriff}
            onChange={(e) => {
              setBegriff(e.target.value);
              setKopiert(null);
            }}
            placeholder="Stoff, UN-Nummer, Adresse, Firma …"
            autoComplete="off"
            className="h-16 pl-13 text-xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="suche-ort" className="shrink-0 text-muted-foreground">
            Ort
          </Label>
          <Input
            id="suche-ort"
            value={ort}
            onChange={(e) => setOrtEingabe(e.target.value)}
            placeholder="für Telefonbuch und Karten"
            autoComplete="off"
            className="h-11"
          />
        </div>
        {!einsatz && (
          <p className="text-sm text-muted-foreground">
            Kein Einsatz aktiv: Suchen landen in keinem Verlauf.{" "}
            <Link href="/app/einsatz/" className="underline underline-offset-4">
              Einsatz wählen
            </Link>
          </p>
        )}
      </form>

      {hatBegriff && (
        <section aria-labelledby="ziele-titel" className="flex flex-col gap-3">
          <h2 id="ziele-titel" className="text-lg font-semibold">
            {ziele.art === "text" ? (
              <>Suchen nach „{ziele.wert}“</>
            ) : (
              <>
                {ERKANNT[ziele.art]} {ziele.wert}
              </>
            )}
          </h2>
          <Liste data-testid="direktsuche">
            {ziele.direkt.map((tool) => {
              const url = suchUrl(tool, ziele.wert, ortFuerSuche, ziele.art)!;
              const hinweis = direktHinweis(tool, ziele.art);
              const mitOrt = Boolean(ortFuerSuche) && nutztOrt(tool, ziele.art);
              return (
                <ZielZeile
                  key={tool.id}
                  tool={tool}
                  href={url}
                  testId="suchziel"
                  untertitel={mitOrt ? `${hinweis} · in ${ortFuerSuche}` : hinweis}
                  onClick={() => sucheMerken(einsatz, tool, { begriff: ziele.wert, ort: ortFuerSuche, url, art: "direkt" })}
                />
              );
            })}
          </Liste>

          {ziele.kopieren.length > 0 && (
            <Collapsible className="flex flex-col gap-3" key={ziele.art} defaultOpen={ziele.art !== "text"}>
              <CollapsibleZeile className="flex min-h-11 items-center text-base font-medium text-muted-foreground">
                Weitere Datenbanken ({ziele.kopieren.length}): Begriff wird kopiert
              </CollapsibleZeile>
              <CollapsibleContent>
                <Liste className="mt-2" data-testid="kopierziele">
                  {ziele.kopieren.map((tool) => (
                    <ZielZeile
                      key={tool.id}
                      tool={tool}
                      href={tool.url}
                      untertitel={kopiert === tool.id ? `„${ziele.wert}“ kopiert. ${tool.kopierHinweis}` : tool.kopierHinweis}
                      onClick={() => {
                        void kopieren(ziele.wert).then((ok) => setKopiert(ok ? tool.id : null));
                        sucheMerken(einsatz, tool, { begriff: ziele.wert, ort: "", url: tool.url, art: "kopiert" });
                      }}
                    />
                  ))}
                </Liste>
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      )}

      {einsatz && (
        <section aria-labelledby="verlauf-titel" className="flex flex-col gap-3">
          <h2 id="verlauf-titel" className="text-lg font-semibold">
            Verlauf im Einsatz
          </h2>
          <Suchverlauf verlauf={verlauf ?? []} />
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Alle verlinkten Dienste nach Thema:{" "}
        <Link href="/app/tools/recherche/" className="underline underline-offset-4">
          Externe Tools
        </Link>
      </p>
    </div>
  );
}
