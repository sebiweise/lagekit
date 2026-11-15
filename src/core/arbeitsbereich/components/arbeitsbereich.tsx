"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Columns2, Grid2x2, GripVertical, LayoutPanelLeft, Plus, Rows2, Square, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ansichten, ansichtVon } from "@/tools/ansichten";
import {
  anteil,
  AUFTEILUNGEN,
  aufteilen,
  bereinigen,
  feldVon,
  geometrie,
  LEER,
  leeren,
  platzieren,
  schliessen,
  sichtbareFelder,
  zeigen,
  type Arbeitsbereich as Zustand,
  type Aufteilung,
  type Rechteck,
  type Trenner,
} from "../zustand";

const SPEICHER = "lagekit.arbeitsbereich";
const BREIT = "(min-width: 64rem)";
/** Eigener Datentyp beim Ziehen, damit ein Tab nicht als Text in einem Eingabefeld landet. */
const ZIEH_TYP = "application/x-lagekit-tool";
/** Abstand zwischen den Feldern in px. */
const ABSTAND = 12;
/** Höhe der Kopfzeile eines Felds in px (h-12 + Rand). */
const FELD_KOPF = 49;

const SYMBOLE: Record<Aufteilung, LucideIcon> = {
  eins: Square,
  zwei: Columns2,
  uebereinander: Rows2,
  drei: LayoutPanelLeft,
  vier: Grid2x2,
};

/** Mehrere Felder nur auf breiten Bildschirmen (Tablet quer, PC). */
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

/** Lage eines Felds in der Fläche; innen liegende Kanten halten Abstand zum Nachbarn. */
function lage(r: Rechteck): CSSProperties {
  const halb = ABSTAND / 2;
  const links = r.x > 0.001 ? halb : 0;
  const rechts = r.x + r.b < 0.999 ? halb : 0;
  const oben = r.y > 0.001 ? halb : 0;
  const unten = r.y + r.h < 0.999 ? halb : 0;
  return {
    left: `calc(${r.x * 100}% + ${links}px)`,
    top: `calc(${r.y * 100}% + ${oben}px)`,
    width: `calc(${r.b * 100}% - ${links + rechts}px)`,
    height: `calc(${r.h * 100}% - ${oben + unten}px)`,
  };
}

function trennerLage(t: Trenner): CSSProperties {
  const halb = ABSTAND / 2;
  if (t.art === "spalte") return { left: `calc(${t.x * 100}% - ${halb}px)`, top: 0, width: ABSTAND, height: "100%" };
  return {
    left: `calc(${t.x * 100}% + ${t.x > 0 ? halb : 0}px)`,
    width: `calc(${t.b * 100}% - ${(t.x > 0 ? halb : 0) + (t.x + t.b < 0.999 ? halb : 0)}px)`,
    top: `calc(${t.y * 100}% - ${halb}px)`,
    height: ABSTAND,
  };
}

/**
 * Mehrere Tools in einem Fenster: als Tabs, auf großen Bildschirmen auch in bis zu vier Feldern,
 * die man per Auswahl oder Ziehen belegt und deren Größe man mit den Trennern ändert.
 * Offene Tabs bleiben geladen (nur ausgeblendet), damit halb ausgefüllte Eingaben beim
 * Wechseln erhalten bleiben. Tabs, Aufteilung und Größen merkt sich jedes Gerät selbst.
 */
export function Arbeitsbereich() {
  const [gespeichert, setZ] = useState<Zustand | null>(null);
  const [auswahlOffen, setAuswahlOffen] = useState(false);
  /** Tool, das gerade gezogen wird, und das Feld darunter. */
  const [gezogen, setGezogen] = useState<string | null>(null);
  const [ziel, setZiel] = useState<number | null>(null);
  const [hoehe, setHoehe] = useState(600);
  const flaeche = useRef<HTMLDivElement>(null);
  const leiste = useRef<HTMLDivElement>(null);
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

  // Auswahl schließen bei Klick daneben oder Escape.
  useEffect(() => {
    if (!auswahlOffen) return;
    const klick = (e: globalThis.PointerEvent) => {
      if (!leiste.current?.contains(e.target as Node)) setAuswahlOffen(false);
    };
    const taste = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setAuswahlOffen(false);
    document.addEventListener("pointerdown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("pointerdown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [auswahlOffen]);

  // Auf schmalen Bildschirmen immer nur ein Tool; die Aufteilung bleibt für später gemerkt.
  const z: Zustand | null = gespeichert && (breit ? gespeichert : { ...gespeichert, aufteilung: "eins", fokus: 0 });
  const raster = !!z && z.aufteilung !== "eins";

  // Felder füllen den Bildschirm bis unten; jedes Feld scrollt für sich.
  useLayoutEffect(() => {
    if (!raster) return;
    const messen = () => {
      const el = flaeche.current;
      if (!el) return;
      const oben = el.getBoundingClientRect().top + window.scrollY;
      setHoehe(Math.max(420, Math.floor(window.innerHeight - oben - 16)));
    };
    messen();
    window.addEventListener("resize", messen);
    return () => window.removeEventListener("resize", messen);
  }, [raster]);

  if (!gespeichert || !z) return null;

  const aendern = (f: (z: Zustand) => Zustand) =>
    setZ((alt) => {
      if (!alt) return alt;
      if (breit) return f(alt);
      return { ...f({ ...alt, aufteilung: "eins", fokus: 0 }), aufteilung: alt.aufteilung, fokus: alt.fokus };
    });
  const fokusSetzen = (feld: number) => raster && z.fokus !== feld && aendern((a) => ({ ...a, fokus: feld }));
  const nichtOffen = ansichten.filter((a) => !z.offen.includes(a.id));
  const sichtbar = sichtbareFelder(z);
  const geo = geometrie(z);

  // Ziehen von Tabs und Feldern (nur bei mehreren Feldern).
  const ziehenStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData(ZIEH_TYP, id);
    e.dataTransfer.effectAllowed = "move";
    // Erst nach dem Start einblenden: Ändert sich die Seite schon während dragstart, bricht Chrome das Ziehen ab.
    setTimeout(() => setGezogen(id), 0);
  };
  const ziehenEnde = () => {
    setGezogen(null);
    setZiel(null);
  };
  const ablage = (feld: number) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(ZIEH_TYP)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (ziel !== feld) setZiel(feld);
    },
    onDragLeave: () => setZiel((alt) => (alt === feld ? null : alt)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData(ZIEH_TYP) || gezogen;
      if (id) aendern((a) => platzieren(a, feld, id));
      ziehenEnde();
    },
  });

  // Trenner verschieben: mit Maus/Finger oder Pfeiltasten; Doppelklick setzt auf die Mitte.
  const anteilSetzen = (t: Trenner, wert: number) =>
    aendern((a) => {
      const neu = anteil(wert);
      if (t.art === "spalte") return { ...a, spalte: neu };
      const zeilen: [number, number] = [...a.zeilen];
      zeilen[t.spalte] = neu;
      return { ...a, zeilen };
    });
  const trennerZiehen = (e: PointerEvent<HTMLDivElement>, t: Trenner) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !flaeche.current) return;
    const r = flaeche.current.getBoundingClientRect();
    anteilSetzen(t, t.art === "spalte" ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height);
  };
  const trennerTaste = (e: KeyboardEvent, t: Trenner) => {
    const jetzt = t.art === "spalte" ? z.spalte : z.zeilen[t.spalte];
    const minus = t.art === "spalte" ? "ArrowLeft" : "ArrowUp";
    const plus = t.art === "spalte" ? "ArrowRight" : "ArrowDown";
    if (e.key === minus) anteilSetzen(t, jetzt - 0.05);
    else if (e.key === plus) anteilSetzen(t, jetzt + 0.05);
    else if (e.key === "Home") anteilSetzen(t, 0.5);
    else return;
    e.preventDefault();
  };

  const feldWahl = (feld: number, id: string | null) => (
    <select
      aria-label={`Tool in Feld ${feld + 1}`}
      className="h-9 min-w-0 flex-1 truncate rounded-md border bg-background px-2 text-base font-medium"
      value={id ?? ""}
      onChange={(e) => {
        // Wert sofort lesen: React setzt das kontrollierte Feld zurück, bevor die Änderung angewendet wird.
        const neu = e.target.value;
        aendern((a) => (neu ? platzieren(a, feld, neu) : leeren(a, feld)));
      }}
    >
      <option value="">Leer</option>
      {ansichten.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );

  const ablageHinweis = (feld: number) =>
    gezogen && (
      <div
        {...ablage(feld)}
        className={cn(
          "absolute inset-0 z-[1000] flex items-center justify-center rounded-xl border-2 border-dashed text-base font-medium",
          ziel === feld ? "border-primary bg-primary/15" : "border-muted-foreground/40 bg-background/60",
        )}
      >
        {ziel === feld ? "Hier ablegen" : `Feld ${feld + 1}`}
      </div>
    );

  return (
    <div className="flex flex-1 flex-col gap-3" data-testid="arbeitsbereich">
      <div
        ref={leiste}
        className="sticky top-[calc(3.75rem+1px+env(safe-area-inset-top))] z-30 -mx-4 lg:top-[calc(4rem+1px)] flex items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 print:hidden"
      >
        <div role="tablist" aria-label="Offene Tools" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {z.offen.map((id) => {
            const a = ansichtVon(id);
            if (!a) return null;
            const feld = feldVon(z, id);
            const aktiv = feld !== null;
            return (
              <div
                key={id}
                draggable={raster}
                onDragStart={(e) => ziehenStart(e, id)}
                onDragEnd={ziehenEnde}
                className={cn(
                  "flex shrink-0 items-center rounded-md border",
                  aktiv ? "border-primary bg-accent font-medium" : "border-transparent hover:bg-accent",
                  raster && "cursor-grab active:cursor-grabbing",
                )}
                title={raster ? "Antippen: im gewählten Feld zeigen. Ziehen: in ein Feld legen." : undefined}
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
                  {raster && aktiv && (
                    <span className="rounded bg-background px-1.5 text-xs text-muted-foreground tabular-nums">
                      <span className="sr-only">Feld </span>
                      {feld + 1}
                    </span>
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
            className="size-11"
            aria-label="Tool öffnen"
            aria-expanded={auswahlOffen}
            onClick={() => setAuswahlOffen(!auswahlOffen)}
          >
            <Plus />
          </Button>
        )}
        <div role="radiogroup" aria-label="Aufteilung" className="hidden shrink-0 rounded-md border p-0.5 lg:flex">
          {AUFTEILUNGEN.map((auf) => {
            const Symbol = SYMBOLE[auf.id];
            const gewaehlt = z.aufteilung === auf.id;
            return (
              <button
                key={auf.id}
                type="button"
                role="radio"
                aria-checked={gewaehlt}
                aria-label={auf.name}
                title={auf.name}
                className={cn(
                  "flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                  gewaehlt && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
                onClick={() => aendern((alt) => aufteilen(alt, auf.id))}
              >
                <Symbol className="size-5" />
              </button>
            );
          })}
        </div>

        {auswahlOffen && nichtOffen.length > 0 && (
          <div className="absolute inset-x-4 top-full z-40 mt-1 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg sm:inset-x-auto sm:right-6 sm:w-[28rem]">
            {raster && (
              <p className="px-2 pb-2 text-sm text-muted-foreground">Öffnet in Feld {z.fokus + 1}.</p>
            )}
            <ul className="grid gap-2 sm:grid-cols-2" aria-label="Tool öffnen">
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
          </div>
        )}
      </div>

      {z.offen.length === 0 && !auswahlOffen && (
        <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
          Noch kein Tool offen. Mit + ein Tool öffnen.
        </p>
      )}

      <div
        ref={flaeche}
        data-testid="arbeitsflaeche"
        data-aufteilung={z.aufteilung}
        className={cn("relative", raster ? "shrink-0" : "flex flex-1 flex-col")}
        style={raster ? { height: hoehe } : undefined}
      >
        {z.offen.map((id) => {
          const a = ansichtVon(id);
          if (!a) return null;
          const feld = feldVon(z, id);
          const r = feld !== null ? geo.felder[feld] : null;
          // Karte im Feld so hoch wie das Feld, abzüglich Kopf, Suche und Innenabstand.
          const karteHoehe = r ? Math.max(288, Math.floor(r.h * hoehe - ABSTAND / 2 - FELD_KOPF - 112)) : null;
          return (
            <section
              key={id}
              aria-label={a.name}
              data-testid={`ansicht-${id}`}
              data-feld={feld === null ? undefined : feld + 1}
              hidden={feld === null}
              onPointerDownCapture={() => feld !== null && fokusSetzen(feld)}
              // Tippen statt Fokus: Tools setzen beim Laden selbst den Fokus und sollen das Feld nicht wechseln.
              onKeyDownCapture={() => feld !== null && fokusSetzen(feld)}
              style={raster && r ? lage(r) : undefined}
              className={cn(
                "min-w-0 flex-col",
                feld === null ? "hidden" : "flex",
                raster && "absolute overflow-hidden rounded-xl border bg-background",
                raster && feld === z.fokus && "border-primary ring-1 ring-primary",
              )}
            >
              {raster && feld !== null && (
                <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-muted/40 px-2">
                  <span
                    draggable
                    onDragStart={(e) => ziehenStart(e, id)}
                    onDragEnd={ziehenEnde}
                    className="flex h-9 cursor-grab items-center gap-1 rounded-md px-1 text-sm font-semibold text-muted-foreground hover:bg-accent active:cursor-grabbing"
                    title="Ziehen, um das Tool in ein anderes Feld zu legen"
                  >
                    <GripVertical className="size-4" aria-hidden />
                    <span className="tabular-nums">{feld + 1}</span>
                  </span>
                  <a.icon className="size-5 shrink-0" aria-hidden />
                  {feldWahl(feld, id)}
                </div>
              )}
              <div
                className={cn(
                  "flex flex-col gap-4",
                  raster && "min-h-0 flex-1 overflow-auto overscroll-contain p-3 xl:p-4",
                )}
                style={karteHoehe && raster ? ({ "--karte-hoehe": `${karteHoehe}px` } as CSSProperties) : undefined}
              >
                <a.Komponente />
              </div>
              {raster && feld !== null && ablageHinweis(feld)}
            </section>
          );
        })}

        {raster &&
          sichtbar.map((id, feld) =>
            id ? null : (
              <div
                key={`leer-${feld}`}
                data-testid={`feld-leer-${feld + 1}`}
                style={lage(geo.felder[feld])}
                onPointerDownCapture={() => fokusSetzen(feld)}
                className={cn(
                  "absolute flex flex-col overflow-hidden rounded-xl border border-dashed",
                  feld === z.fokus && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
                  <span className="px-1 text-sm font-semibold text-muted-foreground tabular-nums">{feld + 1}</span>
                  {feldWahl(feld, null)}
                </div>
                <p className="m-auto max-w-xs p-4 text-center text-muted-foreground">
                  Tool oben auswählen, einen Tab hierher ziehen oder bei markiertem Feld einen Tab antippen.
                </p>
                {ablageHinweis(feld)}
              </div>
            ),
          )}

        {raster &&
          geo.trenner.map((t) => {
            const wert = t.art === "spalte" ? z.spalte : z.zeilen[t.spalte];
            return (
              <div
                key={t.art === "spalte" ? "spalte" : `zeile-${t.spalte}`}
                role="separator"
                tabIndex={0}
                aria-orientation={t.art === "spalte" ? "vertical" : "horizontal"}
                aria-label={t.art === "spalte" ? "Breite der Spalten" : "Höhe der Felder"}
                aria-valuemin={20}
                aria-valuemax={80}
                aria-valuenow={Math.round(wert * 100)}
                title="Ziehen ändert die Größe; Doppelklick teilt gleichmäßig"
                style={trennerLage(t)}
                className={cn(
                  "group absolute z-10 flex touch-none items-center justify-center outline-none select-none",
                  t.art === "spalte" ? "cursor-col-resize" : "cursor-row-resize",
                )}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => trennerZiehen(e, t)}
                onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
                onDoubleClick={() => anteilSetzen(t, 0.5)}
                onKeyDown={(e) => trennerTaste(e, t)}
              >
                <span
                  className={cn(
                    "rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-active:bg-primary",
                    t.art === "spalte" ? "h-12 w-1" : "h-1 w-12",
                  )}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
