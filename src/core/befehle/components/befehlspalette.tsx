"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  ExternalLink,
  FileText,
  Globe,
  Monitor,
  Moon,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Search,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { externeLinks, navigationsZiele, websiteLinks } from "@/components/layout/navigation";
import { useFarbschema } from "@/core/darstellung/use-farbschema";
import { getDb } from "@/core/db/db";
import { einsaetzeSichern } from "@/core/einsatz/components/sicherung";
import { useAktiverEinsatz, useEinsaetze } from "@/core/einsatz/hooks";
import { aktivenEinsatzSetzen } from "@/core/einsatz/repository";
import type { Einsatz } from "@/core/einsatz/schema";
import { exportHref } from "@/core/export/hooks";
import { cn } from "@/lib/utils";
import { sucheMerken } from "@/tools/recherche/components/teile";
import { externeTools } from "@/tools/recherche/katalog";
import { suchUrl, suchziele } from "@/tools/recherche/logic";
import { anfrageStellen } from "../anfrage";
import { BEFEHLE_OEFFNEN } from "../oeffnen";
import { befehleFiltern, istPalettenKuerzel, type Befehl, type BefehlsGruppe } from "../befehle";

/** Wie viele externe Direktsuchen die Palette höchstens anbietet (der Rest steht unter „Suche“). */
const MAX_DIREKTSUCHEN = 4;

/**
 * Befehlspalette: Strg+K (am Mac ⌘K) oder der Knopf in der Kopfzeile öffnet ein
 * Suchfeld über allem. Tippen filtert Seiten, Tools, Einsätze und Aktionen; Enter
 * führt den markierten Befehl aus. Alles läuft offline, nur Ziele mit Pfeil
 * nach außen brauchen Internet.
 */
export function Befehlspalette() {
  const [offen, setOffen] = useState(false);
  const [eingabe, setEingabe] = useState("");

  const oeffnen = (neu: boolean) => {
    setOffen(neu);
    if (neu) setEingabe("");
  };

  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (!istPalettenKuerzel(e) || e.repeat) return;
      // Strg+K öffnet sonst die Suchleiste des Browsers.
      e.preventDefault();
      setOffen((war) => !war);
      setEingabe("");
    };
    const vonAussen = () => {
      setOffen(true);
      setEingabe("");
    };
    window.addEventListener("keydown", beiTaste);
    window.addEventListener(BEFEHLE_OEFFNEN, vonAussen);
    return () => {
      window.removeEventListener("keydown", beiTaste);
      window.removeEventListener(BEFEHLE_OEFFNEN, vonAussen);
    };
  }, []);

  return (
    <>
      <PalettenKnopf onClick={() => oeffnen(true)} />
      <CommandDialog
        open={offen}
        onOpenChange={oeffnen}
        title="Befehle und Suche"
        description="Tippen, um Seiten, Einsätze und Aktionen zu finden. Pfeiltasten wählen, Enter führt aus, Esc schließt."
      >
        {offen && <PalettenInhalt eingabe={eingabe} setEingabe={setEingabe} schliessen={() => setOffen(false)} />}
      </CommandDialog>
    </>
  );
}

/**
 * Knopf in der Kopfzeile: am breiten PC Suchfeld-Optik mit Kürzel, darunter ein
 * Lupen-Symbol. Am Handy fehlt er (der Einsatz braucht den Platz); dort steht
 * „Befehle und Suche“ oben unter „Mehr“.
 */
function PalettenKnopf({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            onClick={onClick}
            aria-label="Befehle und Suche"
            aria-keyshortcuts="Control+K Meta+K"
            data-testid="befehle-knopf"
            className={cn(
              "hidden size-12 shrink-0 px-0 sm:inline-flex",
              "xl:w-56 xl:justify-start xl:gap-2 xl:border xl:bg-background xl:px-3 xl:font-normal xl:text-muted-foreground",
            )}
          />
        }
      >
        <Search />
        <span className="hidden min-w-0 truncate xl:inline">Suchen …</span>
        <KbdGroup className="ml-auto hidden xl:inline-flex">
          <Kbd>Strg</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </TooltipTrigger>
      <TooltipContent>
        Befehle und Suche
        <KbdGroup>
          <Kbd>Strg</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
  );
}

function PalettenInhalt({
  eingabe,
  setEingabe,
  schliessen,
}: {
  eingabe: string;
  setEingabe: (e: string) => void;
  schliessen: () => void;
}) {
  const gruppen = useBefehle(eingabe, schliessen);
  const gefiltert = useMemo(() => befehleFiltern(gruppen, eingabe), [gruppen, eingabe]);

  return (
    <Command<Befehl>
      items={gruppen}
      filteredItems={gefiltert}
      value={eingabe}
      onValueChange={setEingabe}
      itemToStringValue={(b) => b.text}
    >
      <CommandInput placeholder="Tool, Einsatz, Aktion oder Suchbegriff …" aria-label="Befehl oder Suchbegriff" />
      <CommandEmpty>Nichts gefunden.</CommandEmpty>
      <CommandList data-testid="befehle-liste">
        {(gruppe: BefehlsGruppe) => (
          <CommandGroup key={gruppe.titel} items={gruppe.items}>
            <CommandGroupLabel>{gruppe.titel}</CommandGroupLabel>
            <CommandCollection>
              {(befehl: Befehl) => (
                <CommandItem key={befehl.id} value={befehl} onClick={() => befehl.ausfuehren()} data-testid="befehl">
                  <befehl.icon />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{befehl.text}</span>
                    {befehl.hinweis && (
                      <span className="truncate text-sm text-muted-foreground group-data-highlighted/command-item:text-accent-foreground/80">
                        {befehl.hinweis}
                      </span>
                    )}
                  </span>
                  {befehl.extern && <ExternalLink className="size-4" aria-label="öffnet im Internet" />}
                  {befehl.kuerzel && (
                    <CommandShortcut>
                      {befehl.kuerzel.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </CommandShortcut>
                  )}
                </CommandItem>
              )}
            </CommandCollection>
          </CommandGroup>
        )}
      </CommandList>
      <CommandFooter>
        <span className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          wählen
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd> ausführen
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> schließen
        </span>
      </CommandFooter>
    </Command>
  );
}

/** Alle Befehle, passend zum aktiven Einsatz und zur Eingabe (Suchziele). */
function useBefehle(eingabe: string, schliessen: () => void): BefehlsGruppe[] {
  const router = useRouter();
  const pfad = usePathname();
  const einsatz = useAktiverEinsatz() ?? null;
  const einsaetze = useEinsaetze();
  const { wahl, setzen } = useFarbschema();

  return useMemo(() => {
    const gehe = (href: string) => () => {
      schliessen();
      router.push(href);
    };
    const tun = (f: () => void) => () => {
      schliessen();
      f();
    };
    const gruppen: BefehlsGruppe[] = [];

    // Sobald etwas getippt ist: Suche in externen Tools. Passt nichts anderes, steht sie oben.
    const begriff = eingabe.trim();
    if (begriff) {
      gruppen.push({ titel: "Suchen", nachrangig: true, items: suchBefehle(begriff, einsatz, { gehe, tun }) });
    }

    gruppen.push({ titel: "Einsatz", items: einsatzBefehle(einsatz, einsaetze ?? [], { gehe, tun, pfad }) });

    gruppen.push({
      titel: "Gehe zu",
      items: navigationsZiele().map((z) => ({
        id: `nav:${z.href}`,
        text: z.text,
        hinweis: z.beschreibung,
        icon: z.icon,
        stichworte: z.kurz ? [z.kurz] : undefined,
        ausfuehren: gehe(z.href),
      })),
    });

    gruppen.push({
      titel: "Darstellung",
      items: (
        [
          { id: "hell", text: "Hell", icon: Sun },
          { id: "dunkel", text: "Dunkel", icon: Moon },
          { id: "system", text: "Wie das Gerät", icon: Monitor },
        ] as const
      ).map((f) => ({
        id: `farbe:${f.id}`,
        text: `Darstellung: ${f.text}`,
        hinweis: wahl === f.id ? "gerade gewählt" : undefined,
        stichworte: ["Farbschema", "Nachtmodus", "Dunkelmodus", "Theme"],
        icon: f.icon,
        ausfuehren: tun(() => setzen(f.id)),
      })),
    });

    gruppen.push({
      titel: "Lagekit",
      items: websiteLinks.map((z) => ({
        id: `web:${z.href}`,
        text: z.text,
        hinweis: z.beschreibung,
        icon: z.icon,
        stichworte: ["Hilfe", "Anleitung"],
        ausfuehren: gehe(z.href),
      })),
    });

    gruppen.push({
      titel: "Im Internet",
      items: externeLinks.map((z) => ({
        id: `extern:${z.href}`,
        text: z.text,
        hinweis: z.beschreibung,
        icon: z.icon,
        extern: true,
        ausfuehren: tun(() => window.open(z.href, "_blank", "noopener")),
      })),
    });

    return gruppen;
  }, [eingabe, einsatz, einsaetze, wahl, setzen, router, pfad, schliessen]);
}

function einsatzBefehle(
  einsatz: Einsatz | null,
  einsaetze: Einsatz[],
  { gehe, tun, pfad }: { gehe: (href: string) => () => void; tun: (f: () => void) => () => void; pfad: string },
): Befehl[] {
  const befehle: Befehl[] = [];
  // Auf der Zielseite ohne Seitenwechsel, sonst nach dem Laden der Seite.
  const auftrag = (href: string, anfrage: Parameters<typeof anfrageStellen>[0]) =>
    tun(() => {
      anfrageStellen(anfrage);
      if (pfad !== href) gehe(href)();
    });

  if (einsatz && einsatz.status !== "abgeschlossen") {
    befehle.push({
      id: "tagebuch-eintrag",
      text: "Tagebuch-Eintrag schreiben",
      hinweis: einsatz.stichwort,
      stichworte: ["Einsatztagebuch", "Meldung", "Notiz", "neu"],
      icon: NotebookPen,
      ausfuehren: auftrag("/app/tools/einsatztagebuch/", "tagebuch-eintrag"),
    });
  }
  befehle.push({
    id: "einsatz-neu",
    text: "Neuen Einsatz anlegen",
    stichworte: ["Einsatz", "anlegen", "starten", "Übung"],
    icon: Plus,
    ausfuehren: auftrag("/app/einsatz/", "einsatz-neu"),
  });
  if (einsatz) {
    befehle.push(
      {
        id: "einsatz-bearbeiten",
        text: "Einsatz bearbeiten",
        hinweis: `${einsatz.stichwort}: Stichwort, Ort, Einheit, Beginn`,
        icon: Pencil,
        ausfuehren: auftrag("/app/einsatz/", "einsatz-bearbeiten"),
      },
      {
        id: "bericht",
        text: "Einsatzbericht drucken oder als PDF",
        hinweis: einsatz.stichwort,
        stichworte: ["PDF", "Druck", "Bericht", "Export"],
        icon: FileText,
        ausfuehren: gehe(exportHref("/app/export/bericht/", einsatz.id)),
      },
      {
        id: "sichern",
        text: "Einsatz sichern (Datei herunterladen)",
        hinweis: einsatz.stichwort,
        stichworte: ["Sicherung", "Backup", "Export", "JSON"],
        icon: Save,
        ausfuehren: tun(() => void einsaetzeSichern([einsatz.id])),
      },
    );
  }
  // Wechseln: laufende zuerst, abgeschlossene danach; der aktive fehlt.
  const andere = einsaetze
    .filter((e) => e.id !== einsatz?.id)
    .sort((a, b) => Number(a.status === "abgeschlossen") - Number(b.status === "abgeschlossen"));
  for (const e of andere) {
    befehle.push({
      id: `wechseln:${e.id}`,
      text: `Wechseln zu ${e.stichwort}`,
      hinweis: [e.ort, e.status === "abgeschlossen" ? "abgeschlossen" : null].filter(Boolean).join(" · ") || undefined,
      stichworte: ["Einsatz", "auswählen", e.einheit ?? ""],
      icon: ArrowRightLeft,
      ausfuehren: tun(() => void aktivenEinsatzSetzen(getDb(), e.id)),
    });
  }
  return befehle;
}

function suchBefehle(
  begriff: string,
  einsatz: Einsatz | null,
  { gehe, tun }: { gehe: (href: string) => () => void; tun: (f: () => void) => () => void },
): Befehl[] {
  const ziele = suchziele(externeTools, begriff, einsatz);
  // Bei UN-/CAS-Nummern spielt der Ort keine Rolle.
  const ort = ziele.art === "text" ? (einsatz?.ort ?? "") : "";
  const befehle: Befehl[] = [
    {
      id: "suche",
      text: `„${begriff}“ in externen Tools suchen`,
      hinweis: "Alle passenden Datenbanken und Karten auf einen Blick",
      icon: Search,
      immer: true,
      ausfuehren: gehe(`/app/suche/?q=${encodeURIComponent(begriff)}`),
    },
  ];
  for (const tool of ziele.direkt.slice(0, MAX_DIREKTSUCHEN)) {
    const url = suchUrl(tool, ziele.wert, ort);
    if (!url) continue;
    befehle.push({
      id: `direkt:${tool.id}`,
      text: `${tool.name}: „${ziele.wert}“`,
      hinweis: tool.anbieter,
      icon: Globe,
      extern: true,
      immer: true,
      ausfuehren: tun(() => {
        sucheMerken(einsatz, tool, { begriff: ziele.wert, ort, url, art: "direkt" });
        window.open(url, "_blank", "noopener");
      }),
    });
  }
  return befehle;
}
