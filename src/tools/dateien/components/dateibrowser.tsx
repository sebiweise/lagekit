"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronRight,
  Copy,
  File,
  FileText,
  Film,
  Folder,
  FolderPlus,
  Image as BildIcon,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateiArt, dateiZeigen, type DateiZiel } from "@/core/dateien/components/datei-vorschau";
import { groesseText, ordnerAuswaehlen, ordnerAuswahlMoeglich, type DateiInfo } from "@/core/dateien/ordner";
import { ordnerDesEinsatzes, ordnerVerknuepfen, type VerknuepfterOrdner } from "@/core/dateien/repository";
import { ordnerPruefen, useZugriffe, zugriffErlauben } from "@/core/dateien/ueberwachung";
import { dateienFiltern, verweisText } from "@/core/dateien/verweis";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { formatDatumZeit } from "@/lib/zeit";

const nie = () => () => {};

function DateiIcon({ name }: { name: string }) {
  const art = dateiArt(name);
  const Icon = art === "bild" ? BildIcon : art === "video" ? Film : art === "text" || art === "pdf" ? FileText : File;
  return <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />;
}

interface Ort {
  ordner: string;
  /** Unterordner relativ zum verknüpften Ordner, ohne Schrägstrich am Ende; "" = oberste Ebene. */
  unter: string;
}

/** Unterordner und Dateien einer Ebene aus der flachen Dateiliste. */
export function ebene(dateien: DateiInfo[], unter: string) {
  const praefix = unter ? `${unter}/` : "";
  const ordner = new Map<string, { anzahl: number; geaendert: number }>();
  const direkt: DateiInfo[] = [];
  for (const d of dateien) {
    if (!d.pfad.startsWith(praefix)) continue;
    const rest = d.pfad.slice(praefix.length);
    const schnitt = rest.indexOf("/");
    if (schnitt < 0) {
      direkt.push(d);
    } else {
      const name = rest.slice(0, schnitt);
      const bisher = ordner.get(name) ?? { anzahl: 0, geaendert: 0 };
      ordner.set(name, { anzahl: bisher.anzahl + 1, geaendert: Math.max(bisher.geaendert, d.geaendert) });
    }
  }
  return {
    ordner: [...ordner.entries()].map(([name, info]) => ({ name, ...info })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    dateien: direkt,
  };
}

function DateiZeile({
  ordner,
  datei,
  neu,
  anzeigeName,
  onOeffnen,
}: {
  ordner: string;
  datei: DateiInfo;
  neu: boolean;
  anzeigeName: string;
  onOeffnen: () => void;
}) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <li className="flex items-center gap-1 border-b last:border-b-0" data-testid="datei-zeile">
      <button
        type="button"
        onClick={onOeffnen}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
      >
        <DateiIcon name={datei.pfad} />
        <span className="min-w-0 flex-1">
          <span className="block break-all">
            {anzeigeName}
            {neu && <Badge className="ml-2">neu</Badge>}
          </span>
          <span className="block text-sm text-muted-foreground tabular-nums">
            {groesseText(datei.groesse)} · {formatDatumZeit(new Date(datei.geaendert))}
          </span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        title="Verweis für das Einsatztagebuch kopieren"
        aria-label={`Verweis auf ${anzeigeName} kopieren`}
        onClick={() =>
          void navigator.clipboard?.writeText(verweisText(ordner, datei.pfad)).then(() => {
            setKopiert(true);
            setTimeout(() => setKopiert(false), 1500);
          })
        }
      >
        {kopiert ? <span className="text-xs">Kopiert</span> : <Copy />}
      </Button>
    </li>
  );
}

/**
 * Dateibrowser für die verknüpften Ordner des aktiven Einsatzes. Liest nur die
 * gespeicherte Dateiliste der letzten Prüfung; geöffnet wird erst beim Antippen.
 */
export function Dateibrowser() {
  const einsatz = useAktiverEinsatz();
  const db = getDb();
  const liste = useLiveQuery(async () => (einsatz ? ordnerDesEinsatzes(db, einsatz.id) : []), [einsatz?.id]);
  const zugriffe = useZugriffe();
  const moeglich = useSyncExternalStore(nie, ordnerAuswahlMoeglich, () => false);
  const [ort, setOrt] = useState<Ort | null>(null);
  const [suche, setSuche] = useState("");
  const [nachDatum, setNachDatum] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  if (einsatz === undefined || liste === undefined) return null;
  if (einsatz === null) {
    return (
      <p>
        Kein Einsatz aktiv. <Link href="/app/einsatz/" className="underline">Einsatz auswählen</Link>
      </p>
    );
  }

  async function verknuepfen() {
    setFehler(null);
    try {
      const handle = await ordnerAuswaehlen();
      if (!handle) return;
      await ordnerPruefen(db, await ordnerVerknuepfen(db, einsatz!.id, handle));
    } catch (e) {
      setFehler(`Ordner konnte nicht verknüpft werden: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const aktuell: VerknuepfterOrdner | undefined = ort ? liste.find((o) => o.name === ort.ordner) : undefined;
  if (ort && !aktuell) setOrt(null);

  function oeffnen(ziele: DateiZiel[], index: number) {
    dateiZeigen(einsatz!.id, ziele, index);
  }

  const sortiert = (dateien: DateiInfo[]) =>
    [...dateien].sort((a, b) => (nachDatum ? b.geaendert - a.geaendert : a.pfad.localeCompare(b.pfad, "de")));

  const kopf = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Dateien durchsuchen"
          placeholder="Dateien durchsuchen"
          className="pl-10"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
      </div>
      <Button variant="outline" onClick={() => setNachDatum(!nachDatum)} aria-pressed={nachDatum}>
        {nachDatum ? "Neueste zuerst" : "Nach Name"}
      </Button>
      {moeglich && (
        <Button variant="outline" onClick={() => void verknuepfen()}>
          <FolderPlus /> Ordner verknüpfen
        </Button>
      )}
    </div>
  );

  if (liste.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-dashed p-6 text-muted-foreground" data-testid="dateien-leer">
          {moeglich
            ? "Noch kein Ordner verknüpft. Verknüpfen Sie z. B. den Ordner mit Drohnenaufnahmen; Lagekit prüft ihn dann laufend auf neue Dateien."
            : "Ordner verknüpfen geht nur in Chrome oder Edge am PC. Dort erscheinen die Dateien hier und im Einsatztagebuch."}
        </p>
        {moeglich && (
          <div>
            <Button onClick={() => void verknuepfen()}>
              <FolderPlus /> Ordner verknüpfen
            </Button>
          </div>
        )}
        {fehler && <p role="alert" className="text-destructive">{fehler}</p>}
      </div>
    );
  }

  // Suche über alle Ordner.
  if (suche.trim()) {
    const treffer = dateienFiltern(liste, suche, 200);
    const ziele = treffer.map((t) => ({ ordner: t.ordner, pfad: t.pfad }));
    return (
      <div className="flex flex-col gap-4">
        {kopf}
        <p className="text-sm text-muted-foreground">{treffer.length === 200 ? "Mehr als 200 Treffer, die neuesten:" : `${treffer.length} Treffer`}</p>
        <ul className="rounded-xl border">
          {treffer.map((t, i) => (
            <DateiZeile
              key={`${t.ordner}/${t.pfad}`}
              ordner={t.ordner}
              datei={t}
              neu={liste.find((o) => o.name === t.ordner)?.neu.includes(t.pfad) ?? false}
              anzeigeName={`${t.ordner}/${t.pfad}`}
              onOeffnen={() => oeffnen(ziele, i)}
            />
          ))}
        </ul>
      </div>
    );
  }

  if (!ort || !aktuell) {
    return (
      <div className="flex flex-col gap-4">
        {kopf}
        <ul className="rounded-xl border">
          {liste.map((o) => {
            const zugriff = zugriffe.get(o.id);
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-2 border-b pr-3 last:border-b-0" data-testid="ordner-eintrag">
                <button
                  type="button"
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                  onClick={() => setOrt({ ordner: o.name, unter: "" })}
                >
                  <Folder className="size-6 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-all">
                      {o.name}
                      {o.neu.length > 0 && <Badge className="ml-2">{o.neu.length} neu</Badge>}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {o.dateien.length} Dateien, {groesseText(o.dateien.reduce((s, d) => s + d.groesse, 0))}
                      {o.geprueftAm && ` · geprüft ${formatDatumZeit(o.geprueftAm)}`}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
                {zugriff === "fragen" && (
                  <Button size="sm" onClick={() => void zugriffErlauben(db, o)}>
                    <ShieldCheck /> Zugriff erlauben
                  </Button>
                )}
                {zugriff === "erlaubt" && (
                  <Button size="sm" variant="ghost" aria-label={`${o.name} jetzt prüfen`} onClick={() => void ordnerPruefen(db, o)}>
                    <RefreshCw />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {fehler && <p role="alert" className="text-destructive">{fehler}</p>}
        <p className="text-sm text-muted-foreground">
          Datei antippen öffnet die Vorschau. Im Einsatztagebuch „/“ tippen, um auf eine Datei zu verweisen. Ordner verwalten unter{" "}
          <Link href="/app/export/#ordner" className="underline">Export, Druck, Mail</Link>.
        </p>
      </div>
    );
  }

  const { ordner: unterordner, dateien } = ebene(aktuell.dateien, ort.unter);
  const reihe = sortiert(dateien);
  const ziele = reihe.map((d) => ({ ordner: aktuell.name, pfad: d.pfad }));
  const neu = new Set(aktuell.neu);
  const stufen = ort.unter ? ort.unter.split("/") : [];

  return (
    <div className="flex flex-col gap-4">
      {kopf}
      <nav aria-label="Ordnerpfad" className="flex flex-wrap items-center gap-1 text-sm">
        <button type="button" className="rounded px-2 py-1 underline-offset-4 hover:underline" onClick={() => setOrt(null)}>
          Alle Ordner
        </button>
        {[aktuell.name, ...stufen].map((teil, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            <button
              type="button"
              className="rounded px-2 py-1 font-medium underline-offset-4 hover:underline aria-[current=page]:no-underline"
              aria-current={i === stufen.length ? "page" : undefined}
              onClick={() => setOrt({ ordner: aktuell.name, unter: stufen.slice(0, i).join("/") })}
            >
              {teil}
            </button>
          </span>
        ))}
      </nav>
      <ul className="rounded-xl border">
        {unterordner.map((u) => (
          <li key={u.name} className="border-b last:border-b-0">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
              onClick={() => setOrt({ ordner: aktuell.name, unter: ort.unter ? `${ort.unter}/${u.name}` : u.name })}
            >
              <Folder className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 break-all">{u.name}</span>
              <span className="text-sm text-muted-foreground">{u.anzahl} Dateien</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
        {reihe.map((d, i) => (
          <DateiZeile
            key={d.pfad}
            ordner={aktuell.name}
            datei={d}
            neu={neu.has(d.pfad)}
            anzeigeName={d.pfad.split("/").pop() ?? d.pfad}
            onOeffnen={() => oeffnen(ziele, i)}
          />
        ))}
        {unterordner.length === 0 && reihe.length === 0 && <li className="p-4 text-muted-foreground">Leer.</li>}
      </ul>
    </div>
  );
}
