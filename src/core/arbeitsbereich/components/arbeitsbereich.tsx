"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Columns2, Plus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ansichten, ansichtVon } from "@/tools/ansichten";
import { bereinigen, LEER, schliessen, teilen, zeigen, type Arbeitsbereich as Zustand, type Seite } from "../zustand";

const SPEICHER = "lagekit.arbeitsbereich";
const BREIT = "(min-width: 64rem)";

/** Nebeneinander nur auf breiten Bildschirmen (Tablet quer, PC). */
function useBreit() {
  return useSyncExternalStore(
    (f) => {
      const m = matchMedia(BREIT);
      m.addEventListener("change", f);
      return () => m.removeEventListener("change", f);
    },
    () => matchMedia(BREIT).matches,
    () => false,
  );
}

function laden(): Zustand {
  try {
    const roh = localStorage.getItem(SPEICHER);
    return bereinigen(roh ? JSON.parse(roh) : null, ansichten.map((a) => a.id));
  } catch {
    return LEER;
  }
}

/**
 * Mehrere Tools in einem Fenster: als Tabs, auf großen Bildschirmen auch nebeneinander.
 * Offene Tabs bleiben geladen (nur ausgeblendet), damit halb ausgefüllte Eingaben beim
 * Wechseln erhalten bleiben. Welche Tabs offen sind, merkt sich jedes Gerät selbst.
 */
export function Arbeitsbereich() {
  const [gespeichert, setZ] = useState<Zustand | null>(null);
  const [auswahlOffen, setAuswahlOffen] = useState(false);
  const breit = useBreit();

  // Erst im Browser laden: Die Seite ist statisch vorgerendert.
  useEffect(() => {
    const geladen = laden();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Laden aus dem Gerätespeicher
    setZ(geladen);
    if (geladen.offen.length === 0) setAuswahlOffen(true);
  }, []);

  useEffect(() => {
    if (!gespeichert) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(gespeichert));
    } catch {
      // Privater Modus o. Ä.: dann eben ohne Merken.
    }
  }, [gespeichert]);

  if (!gespeichert) return null;
  // Auf schmalen Bildschirmen immer nur ein Tool; die Teilung bleibt für später gemerkt.
  const z: Zustand = breit ? gespeichert : { ...gespeichert, geteilt: false, fokus: "links" };

  const aendern = (f: (z: Zustand) => Zustand) =>
    setZ((alt) => {
      if (!alt) return alt;
      if (breit) return f(alt);
      return { ...f({ ...alt, geteilt: false, fokus: "links" }), geteilt: alt.geteilt, fokus: alt.fokus };
    });
  const sichtbar = (id: string) => id === z.links || (z.geteilt && id === z.rechts);
  const fokusSetzen = (seite: Seite) => z.geteilt && z.fokus !== seite && aendern((a) => ({ ...a, fokus: seite }));
  const nichtOffen = ansichten.filter((a) => !z.offen.includes(a.id));

  return (
    <div className="flex flex-1 flex-col gap-3" data-testid="arbeitsbereich">
      <div className="sticky top-[calc(3.75rem+1px+env(safe-area-inset-top))] z-30 -mx-4 lg:top-[calc(4rem+1px)] flex items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 print:hidden">
        <div role="tablist" aria-label="Offene Tools" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {z.offen.map((id) => {
            const a = ansichtVon(id);
            if (!a) return null;
            const aktiv = sichtbar(id);
            return (
              <div
                key={id}
                className={cn(
                  "flex shrink-0 items-center rounded-md border",
                  aktiv ? "border-primary bg-accent font-medium" : "border-transparent hover:bg-accent",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={aktiv}
                  className="flex h-11 items-center gap-2 pl-3 pr-1 text-base"
                  onClick={() => aendern((alt) => zeigen(alt, id))}
                >
                  <a.icon className="size-5" aria-hidden />
                  {a.name}
                  {z.geteilt && aktiv && (
                    <span className="text-xs text-muted-foreground">{id === z.links ? "links" : "rechts"}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={`${a.name} schließen`}
                  onClick={() => aendern((alt) => schliessen(alt, id))}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
        {nichtOffen.length > 0 && (
          <Button
            variant={auswahlOffen ? "secondary" : "outline"}
            size="icon"
            aria-label="Tool öffnen"
            aria-expanded={auswahlOffen}
            onClick={() => setAuswahlOffen(!auswahlOffen)}
          >
            <Plus />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="hidden lg:inline-flex"
          aria-pressed={z.geteilt}
          aria-label={z.geteilt ? "Ein Tool zeigen" : "Zwei Tools nebeneinander"}
          title={z.geteilt ? "Ein Tool zeigen" : "Zwei Tools nebeneinander"}
          onClick={() => aendern((alt) => teilen(alt, !alt.geteilt))}
        >
          {z.geteilt ? <Square /> : <Columns2 />}
        </Button>
      </div>

      {auswahlOffen && nichtOffen.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tool öffnen">
          {nichtOffen.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex h-14 w-full items-center gap-3 rounded-md border px-4 text-left text-base hover:bg-accent"
                onClick={() => {
                  aendern((alt) => zeigen(alt, a.id));
                  setAuswahlOffen(false);
                }}
              >
                <a.icon className="size-5" aria-hidden /> {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {z.offen.length === 0 && !auswahlOffen && (
        <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
          Noch kein Tool offen. Mit + ein Tool öffnen.
        </p>
      )}

      <div className={cn("grid flex-1 gap-4", z.geteilt && "lg:grid-cols-2")}>
        {z.offen.map((id) => {
          const a = ansichtVon(id);
          if (!a) return null;
          const seite: Seite | null = id === z.links ? "links" : z.geteilt && id === z.rechts ? "rechts" : null;
          return (
            <section
              key={id}
              aria-label={a.name}
              data-testid={`ansicht-${id}`}
              hidden={!seite}
              onPointerDownCapture={() => seite && fokusSetzen(seite)}
              onFocusCapture={() => seite && fokusSetzen(seite)}
              className={cn(
                "min-w-0 flex-col gap-4",
                seite ? "flex" : "hidden",
                seite === "rechts" ? "order-2" : "order-1",
                z.geteilt && "rounded-xl border p-3 sm:p-4",
                z.geteilt && seite === z.fokus && "border-primary",
              )}
            >
              {z.geteilt && (
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <a.icon className="size-5" aria-hidden /> {a.name}
                </h2>
              )}
              <a.Komponente />
            </section>
          );
        })}
        {z.geteilt && !z.rechts && z.offen.length > 0 && (
          <div
            className={cn(
              "order-2 hidden items-center justify-center rounded-xl border border-dashed p-6 text-center text-muted-foreground lg:flex",
              z.fokus === "rechts" && "border-primary",
            )}
            onPointerDownCapture={() => fokusSetzen("rechts")}
          >
            Einen Tab oben antippen oder mit + ein Tool öffnen; es erscheint hier.
          </div>
        )}
      </div>
    </div>
  );
}
