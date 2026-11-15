"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, FilePlus2, FolderPlus, FolderSync, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import { formatDatumZeit, formatZeit } from "@/lib/zeit";
import { groesseText, ordnerAuswaehlen, ordnerAuswahlMoeglich } from "../ordner";
import { neueGesehen, ordnerDesEinsatzes, ordnerEntfernen, ordnerVerknuepfen, type VerknuepfterOrdner } from "../repository";
import { ordnerPruefen, useZugriffe, zugriffErlauben } from "../ueberwachung";

const nie = () => () => {};

/** Auf dem Server und beim ersten Rendern `false`, danach der echte Wert. */
function useImBrowser<T>(wert: () => T, ersatz: T): T {
  return useSyncExternalStore(nie, wert, () => ersatz);
}

function OrdnerZeile({ ordner }: { ordner: VerknuepfterOrdner }) {
  const db = getDb();
  const zugriff = useZugriffe().get(ordner.id);
  const [prueft, setPrueft] = useState(false);
  const groesse = ordner.dateien.reduce((s, d) => s + d.groesse, 0);
  const neu = new Set(ordner.neu);
  const neueste = [...ordner.dateien].sort((a, b) => b.geaendert - a.geaendert).slice(0, 50);

  async function jetztPruefen() {
    setPrueft(true);
    try {
      await ordnerPruefen(db, ordner);
    } finally {
      setPrueft(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border p-3" data-testid="ordner-zeile">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-semibold break-all">{ordner.name}</span>
        {ordner.neu.length > 0 && <Badge>{ordner.neu.length} neu</Badge>}
        {zugriff === "erlaubt" && (
          <span className="flex items-center gap-1 text-sm text-ok">
            <ShieldCheck className="size-4" aria-hidden /> wird überwacht
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {ordner.geprueftAm
          ? `${ordner.dateien.length} Dateien, ${groesseText(groesse)} · geprüft ${formatZeit(ordner.geprueftAm, true)}`
          : "Noch nicht geprüft"}
        {ordner.abgeschnitten && " · Sehr viele Dateien: nur die ersten 5000 werden berücksichtigt."}
      </p>
      {zugriff === "fragen" && (
        <p className="text-sm">Der Browser fragt nach einem Neustart erneut, ob Lagekit den Ordner lesen darf.</p>
      )}
      {zugriff === "verweigert" && (
        <p className="text-sm text-destructive" role="alert">
          Ordner nicht erreichbar (gelöscht, umbenannt, Laufwerk getrennt oder Zugriff abgelehnt). Neu verknüpfen hilft.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {zugriff !== "erlaubt" && (
          <Button size="sm" onClick={() => void zugriffErlauben(db, ordner)}>
            <ShieldCheck /> Zugriff erlauben
          </Button>
        )}
        {zugriff === "erlaubt" && (
          <Button size="sm" variant="outline" disabled={prueft} onClick={() => void jetztPruefen()}>
            <RefreshCw className={prueft ? "animate-spin" : undefined} /> Jetzt prüfen
          </Button>
        )}
        {ordner.neu.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => void neueGesehen(db, ordner.id)}>
            <Check /> Als gesehen markieren
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => void ordnerEntfernen(db, ordner.id)}>
          <Trash2 /> Verknüpfung lösen
        </Button>
      </div>
      {neueste.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer py-1 font-medium">Dateien ansehen (neueste zuerst)</summary>
          <ul className="mt-1 flex max-h-64 flex-col overflow-y-auto">
            {neueste.map((d) => (
              <li key={d.pfad} className="flex flex-wrap justify-between gap-x-3 border-b py-1">
                <span className="break-all">
                  {neu.has(d.pfad) && <Badge className="mr-2">neu</Badge>}
                  {d.pfad}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {groesseText(d.groesse)} · {formatDatumZeit(new Date(d.geaendert))}
                </span>
              </li>
            ))}
          </ul>
          {ordner.dateien.length > neueste.length && (
            <p className="py-1 text-muted-foreground">… und {ordner.dateien.length - neueste.length} weitere</p>
          )}
        </details>
      )}
    </li>
  );
}

/**
 * Verknüpfte Ordner des Einsatzes (nur Chrome/Edge am PC) und Dateien, die
 * einmalig zum Export dazukommen (überall, auch iPhone).
 */
export function OrdnerVerwaltung({
  einsatzId,
  zusaetzlich,
  setZusaetzlich,
}: {
  einsatzId: string;
  zusaetzlich: File[];
  setZusaetzlich: (dateien: File[]) => void;
}) {
  const db = getDb();
  const ordner = useLiveQuery(() => ordnerDesEinsatzes(db, einsatzId), [einsatzId]);
  const moeglich = useImBrowser(ordnerAuswahlMoeglich, false);
  const ordnerEingabeMoeglich = useImBrowser(() => "webkitdirectory" in document.createElement("input"), false);
  const [fehler, setFehler] = useState<string | null>(null);
  const dateiEingabe = useRef<HTMLInputElement>(null);
  const ordnerEingabe = useRef<HTMLInputElement>(null);

  async function verknuepfen() {
    setFehler(null);
    try {
      const handle = await ordnerAuswaehlen();
      if (!handle) return;
      const neu = await ordnerVerknuepfen(db, einsatzId, handle);
      await ordnerPruefen(db, neu);
    } catch (e) {
      setFehler(`Ordner konnte nicht verknüpft werden: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function hinzufuegen(liste: FileList | null) {
    if (liste && liste.length > 0) setZusaetzlich([...zusaetzlich, ...Array.from(liste)]);
    if (dateiEingabe.current) dateiEingabe.current.value = "";
    if (ordnerEingabe.current) ordnerEingabe.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {moeglich ? (
        <>
          <p className="text-muted-foreground">
            Lagekit prüft verknüpfte Ordner alle 15 Sekunden, solange die App offen ist, und meldet neue Dateien. Der
            Inhalt kommt in den ZIP-Export. Die Verknüpfung gilt nur auf diesem Gerät.
          </p>
          {ordner && ordner.length > 0 && (
            <ul className="flex flex-col gap-3">
              {ordner.map((o) => (
                <OrdnerZeile key={o.id} ordner={o} />
              ))}
            </ul>
          )}
          <div>
            <Button variant="outline" onClick={() => void verknuepfen()}>
              <FolderPlus /> Ordner verknüpfen
            </Button>
          </div>
          {fehler && (
            <p role="alert" className="text-destructive">
              {fehler}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground" data-testid="ordner-nicht-moeglich">
          <FolderSync className="mr-1 inline size-4 align-[-2px]" aria-hidden />
          Ordner dauerhaft verknüpfen und überwachen geht nur in Chrome oder Edge am PC. Hier lassen sich Dateien
          einmalig zum Export hinzufügen.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="font-medium">Dateien nur für diesen Export</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => dateiEingabe.current?.click()}>
            <FilePlus2 /> Dateien hinzufügen
          </Button>
          {ordnerEingabeMoeglich && (
            <Button variant="outline" onClick={() => ordnerEingabe.current?.click()}>
              <FolderPlus /> Ordner einmalig hinzufügen
            </Button>
          )}
          <input
            ref={dateiEingabe}
            type="file"
            multiple
            className="sr-only"
            aria-label="Dateien hinzufügen"
            data-testid="zusatz-dateien"
            onChange={(e) => hinzufuegen(e.target.files)}
          />
          <input
            ref={ordnerEingabe}
            type="file"
            multiple
            className="sr-only"
            aria-label="Ordner einmalig hinzufügen"
            {...{ webkitdirectory: "" }}
            onChange={(e) => hinzufuegen(e.target.files)}
          />
        </div>
        {zusaetzlich.length > 0 && (
          <ul className="flex flex-col text-sm">
            {zusaetzlich.map((d, i) => (
              <li key={`${d.name}-${i}`} className="flex items-center justify-between gap-2 border-b py-1">
                <span className="break-all">
                  {(d as File & { webkitRelativePath?: string }).webkitRelativePath || d.name}{" "}
                  <span className="text-muted-foreground">({groesseText(d.size)})</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  aria-label={`${d.name} entfernen`}
                  onClick={() => setZusaetzlich(zusaetzlich.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
