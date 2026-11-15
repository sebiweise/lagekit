"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import { dateiHerunterladen } from "@/core/export/download";
import { formatDatumZeit } from "@/lib/zeit";
import { groesseText } from "../ordner";
import { dateiLesen } from "../verweis";

export interface DateiZiel {
  ordner: string;
  pfad: string;
}

interface Anzeige {
  einsatzId: string;
  liste: DateiZiel[];
  index: number;
}

let anzeige: Anzeige | null = null;
const zuhoerer = new Set<() => void>();
function setzen(neu: Anzeige | null) {
  anzeige = neu;
  for (const z of zuhoerer) z();
}

/** Zeigt eine Datei in der Vorschau; mit Liste blättern ← → durch die Nachbarn. */
export function dateiZeigen(einsatzId: string, liste: DateiZiel[], index = 0) {
  setzen({ einsatzId, liste, index });
}

type Art = "bild" | "video" | "audio" | "pdf" | "text" | "sonst";

export function dateiArt(name: string, typ = ""): Art {
  const endung = name.toLowerCase().split(".").pop() ?? "";
  if (typ.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"].includes(endung)) return "bild";
  if (typ.startsWith("video/") || ["mp4", "mov", "m4v", "webm"].includes(endung)) return "video";
  if (typ.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "aac"].includes(endung)) return "audio";
  if (typ === "application/pdf" || endung === "pdf") return "pdf";
  if (typ.startsWith("text/") || ["txt", "csv", "json", "md", "log", "xml", "gpx", "kml", "srt"].includes(endung)) return "text";
  return "sonst";
}

type Geladen = { ziel: DateiZiel; datei: File; url: string; text: string | null } | { ziel: DateiZiel; fehler: string };

/**
 * Vorschau für Bilder, Videos, Ton, PDF und Text, im Layout eingebunden. Öffnet
 * sich über `dateiZeigen` aus Dateibrowser und Einsatztagebuch.
 */
export function DateiVorschau() {
  const aktuell = useSyncExternalStore(
    (z) => {
      zuhoerer.add(z);
      return () => zuhoerer.delete(z);
    },
    () => anzeige,
    () => null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const [geladen, setGeladen] = useState<Geladen | null>(null);
  const ziel = aktuell ? aktuell.liste[aktuell.index] : null;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (aktuell && !d.open) d.showModal();
    if (!aktuell && d.open) d.close();
  }, [aktuell]);

  useEffect(() => {
    if (!aktuell || !ziel) return;
    let gueltig = true;
    let url: string | null = null;
    dateiLesen(getDb(), aktuell.einsatzId, ziel.ordner, ziel.pfad)
      .then(async (datei) => {
        const art = dateiArt(datei.name, datei.type);
        const text = art === "text" ? await datei.slice(0, 200_000).text() : null;
        url = URL.createObjectURL(datei);
        if (gueltig) setGeladen({ ziel, datei, url, text });
        else URL.revokeObjectURL(url);
      })
      .catch((e: unknown) => {
        if (gueltig) setGeladen({ ziel, fehler: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      gueltig = false;
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 60_000);
    };
  }, [aktuell, ziel]);

  function blaettern(schritt: number) {
    if (!aktuell) return;
    const index = aktuell.index + schritt;
    if (index >= 0 && index < aktuell.liste.length) setzen({ ...aktuell, index });
  }

  const passt = geladen && ziel && geladen.ziel === ziel ? geladen : null;
  const name = ziel ? ziel.pfad.split("/").pop() : "";
  const art = passt && "datei" in passt ? dateiArt(passt.datei.name, passt.datei.type) : null;
  const mehrere = (aktuell?.liste.length ?? 0) > 1;

  return (
    <dialog
      ref={dialog}
      aria-label={`Datei ${name}`}
      data-testid="datei-vorschau"
      className="m-auto h-[min(92dvh,60rem)] w-[min(96vw,80rem)] max-w-none rounded-xl border bg-card p-0 text-card-foreground backdrop:bg-black/70 print:hidden"
      onClose={() => setzen(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") blaettern(-1);
        if (e.key === "ArrowRight") blaettern(1);
      }}
    >
      {aktuell && ziel && (
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" title={ziel.pfad}>
                {name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {ziel.ordner}/{ziel.pfad}
                {passt && "datei" in passt && ` · ${groesseText(passt.datei.size)} · ${formatDatumZeit(new Date(passt.datei.lastModified))}`}
                {mehrere && ` · ${aktuell.index + 1} von ${aktuell.liste.length}`}
              </p>
            </div>
            {mehrere && (
              <>
                <Button size="icon" variant="outline" aria-label="Vorherige Datei" disabled={aktuell.index === 0} onClick={() => blaettern(-1)}>
                  <ChevronLeft />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Nächste Datei"
                  disabled={aktuell.index === aktuell.liste.length - 1}
                  onClick={() => blaettern(1)}
                >
                  <ChevronRight />
                </Button>
              </>
            )}
            {passt && "datei" in passt && (
              <>
                <a href={passt.url} target="_blank" rel="noopener" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <ExternalLink /> <span className="hidden sm:inline">Neuer Tab</span>
                </a>
                <Button size="sm" variant="outline" onClick={() => dateiHerunterladen(passt.datei.name, passt.datei, passt.datei.type)}>
                  <Download /> <span className="hidden sm:inline">Speichern</span>
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" aria-label="Vorschau schließen" onClick={() => dialog.current?.close()}>
              <X />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/40 p-2">
            {!passt && <p className="text-muted-foreground">Wird geladen …</p>}
            {passt && "fehler" in passt && (
              <p role="alert" className="max-w-lg text-center text-destructive">
                {passt.fehler}
              </p>
            )}
            {passt && "datei" in passt && art === "bild" && (
              // eslint-disable-next-line @next/next/no-img-element -- lokale Datei als Blob-URL, kein Bildoptimierer
              <img src={passt.url} alt={name} className="max-h-full max-w-full object-contain" />
            )}
            {passt && "datei" in passt && art === "video" && (
              <video src={passt.url} controls className="max-h-full max-w-full" />
            )}
            {passt && "datei" in passt && art === "audio" && <audio src={passt.url} controls />}
            {passt && "datei" in passt && art === "pdf" && <iframe src={passt.url} title={name} className="h-full w-full bg-white" />}
            {passt && "datei" in passt && art === "text" && (
              <pre className="h-full w-full overflow-auto rounded-md bg-background p-3 text-sm whitespace-pre-wrap">{passt.text}</pre>
            )}
            {passt && "datei" in passt && art === "sonst" && (
              <p className="max-w-lg text-center text-muted-foreground">
                Für diese Datei gibt es keine Vorschau. Mit „Neuer Tab“ oder „Speichern“ öffnen.
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
