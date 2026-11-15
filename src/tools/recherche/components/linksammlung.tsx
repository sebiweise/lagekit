"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { externeTools, THEMEN, type ExternesTool, type Thema } from "../katalog";
import { vorschlagen } from "../logic";
import { Liste, OfflineHinweis, ZielZeile } from "./teile";

function untertitel(tool: ExternesTool) {
  return `${tool.beschreibung} · ${tool.anbieter}`;
}

/** Alle externen Tools nach Thema; passend zum Einsatz oben. Nur Links, keine Suche. */
export function Linksammlung() {
  const einsatz = useAktiverEinsatz();
  if (einsatz === undefined) return null;
  const { vorgeschlagen, weitere } = vorschlagen(externeTools, einsatz);

  const nachThema = new Map<Thema, ExternesTool[]>();
  for (const tool of weitere) {
    const thema = tool.themen[0];
    nachThema.set(thema, [...(nachThema.get(thema) ?? []), tool]);
  }
  const themen = (Object.keys(THEMEN) as Thema[]).filter((t) => nachThema.has(t));

  return (
    <div className="flex flex-col gap-6">
      <OfflineHinweis />

      <Link href="/app/suche/" className={buttonVariants({ size: "lg", className: "justify-start" })}>
        <Search aria-hidden />
        Etwas suchen? Zur Suche
      </Link>

      {vorgeschlagen.length > 0 && einsatz && (
        <section aria-labelledby="vorschlaege-titel" className="flex flex-col gap-2">
          <h2 id="vorschlaege-titel" className="text-lg font-semibold">
            Passend zu „{einsatz.stichwort}“
          </h2>
          <Liste data-testid="vorschlaege">
            {vorgeschlagen.map((tool) => (
              <ZielZeile key={tool.id} tool={tool} href={tool.url} untertitel={untertitel(tool)} testId="externes-tool" />
            ))}
          </Liste>
        </section>
      )}

      {themen.map((thema) => (
        <section key={thema} aria-labelledby={`thema-${thema}`} className="flex flex-col gap-2">
          <h2 id={`thema-${thema}`} className="text-lg font-semibold">
            {THEMEN[thema]}
          </h2>
          <Liste>
            {nachThema.get(thema)!.map((tool) => (
              <ZielZeile key={tool.id} tool={tool} href={tool.url} untertitel={untertitel(tool)} testId="externes-tool" />
            ))}
          </Liste>
        </section>
      ))}
    </div>
  );
}
