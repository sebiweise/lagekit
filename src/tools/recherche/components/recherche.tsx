"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardCopy, ExternalLink, History, Search, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { useOnline } from "@/core/pwa/components/use-online";
import { formatDatumZeit } from "@/lib/zeit";
import { useSuchverlauf } from "../hooks";
import { externeTools, THEMEN, toolNachId, type ExternesTool, type Thema } from "../katalog";
import { suchUrl, vorschlagen } from "../logic";
import { sucheSpeichern } from "../repository";
import type { Suche } from "../schema";

const VERLAUF_KURZ = 5;

async function kopieren(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Recherche() {
  const einsatz = useAktiverEinsatz();
  const verlauf = useSuchverlauf(einsatz?.id);
  const online = useOnline();
  const [begriff, setBegriff] = useState("");
  // `null`: Ort des Einsatzes übernehmen, bis der Nutzer selbst etwas einträgt.
  const [ortEingabe, setOrtEingabe] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);
  const [alleZeigen, setAlleZeigen] = useState(false);

  if (einsatz === undefined) return null;
  const ort = ortEingabe ?? einsatz?.ort ?? "";
  const { vorgeschlagen, weitere } = vorschlagen(externeTools, einsatz);

  function gestartet(tool: ExternesTool, url: string, art: Suche["art"]) {
    if (art === "kopiert") {
      void kopieren(begriff.trim()).then((ok) => setKopiert(ok ? tool.id : null));
    }
    if (!einsatz) return;
    void sucheSpeichern(getDb(), {
      einsatzId: einsatz.id,
      toolId: tool.id,
      toolName: tool.name,
      begriff: begriff.trim(),
      ort: tool.suche ? ort : "",
      url,
      art,
    });
  }

  const zeile = (tool: ExternesTool) => (
    <ToolZeile key={tool.id} tool={tool} begriff={begriff} ort={ort} kopiert={kopiert === tool.id} onStart={gestartet} />
  );

  const nachThema = new Map<Thema, ExternesTool[]>();
  for (const tool of weitere) {
    const thema = tool.themen[0];
    nachThema.set(thema, [...(nachThema.get(thema) ?? []), tool]);
  }

  return (
    <div className="flex flex-col gap-6">
      {!online && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-warn bg-warn/15 p-3">
          <WifiOff className="size-5 shrink-0" aria-hidden />
          Kein Netz: Die externen Tools brauchen Internet. Der Suchverlauf bleibt lesbar.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suchen</CardTitle>
          <CardDescription>
            Begriff eingeben, dann beim passenden Tool auf „Suchen“ tippen. Tools ohne Direktsuche öffnen ihre
            Startseite, der Begriff liegt dann in der Zwischenablage zum Einfügen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="recherche-begriff">Suchbegriff</Label>
            <Input
              id="recherche-begriff"
              type="search"
              value={begriff}
              onChange={(e) => setBegriff(e.target.value)}
              placeholder="Stoff, UN-Nummer, Fahrzeugmodell, Name …"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recherche-ort">Ort</Label>
            <Input
              id="recherche-ort"
              value={ort}
              onChange={(e) => setOrtEingabe(e.target.value)}
              placeholder="Einsatzort"
              autoComplete="off"
            />
          </div>
          {!einsatz && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Kein Einsatz aktiv: Suchen funktionieren, landen aber in keinem Verlauf.{" "}
              <Link href="/einsatz/" className="underline underline-offset-4">
                Einsatz wählen
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {einsatz && (
        <section aria-labelledby="verlauf-titel" className="flex flex-col gap-3">
          <h2 id="verlauf-titel" className="flex items-center gap-2 text-xl font-semibold">
            <History className="size-5" aria-hidden />
            Suchverlauf im Einsatz
          </h2>
          {!verlauf || verlauf.length === 0 ? (
            <p className="text-muted-foreground">Noch keine Suche aus Lagekit gestartet. Suchen aus dieser Seite werden hier für den Einsatz gespeichert.</p>
          ) : (
            <ul className="divide-y rounded-xl border" data-testid="suchverlauf">
              {(alleZeigen ? verlauf : verlauf.slice(0, VERLAUF_KURZ)).map((s) => (
                <VerlaufZeile key={s.id} suche={s} />
              ))}
            </ul>
          )}
          {verlauf && verlauf.length > VERLAUF_KURZ && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setAlleZeigen((x) => !x)}>
              {alleZeigen ? "Weniger anzeigen" : `Alle ${verlauf.length} Suchen anzeigen`}
            </Button>
          )}
        </section>
      )}

      {vorgeschlagen.length > 0 && einsatz && (
        <section aria-labelledby="vorschlaege-titel" className="flex flex-col gap-3">
          <h2 id="vorschlaege-titel" className="text-xl font-semibold">
            Passend zu „{einsatz.stichwort}“
          </h2>
          <ul className="flex flex-col gap-3" data-testid="vorschlaege">
            {vorgeschlagen.map(zeile)}
          </ul>
        </section>
      )}

      <section aria-labelledby="alle-titel" className="flex flex-col gap-4">
        <h2 id="alle-titel" className="text-xl font-semibold">
          {vorgeschlagen.length > 0 ? "Weitere Tools" : "Alle Tools"}
        </h2>
        {[...nachThema].map(([thema, tools]) => (
          <div key={thema} className="flex flex-col gap-3">
            <h3 className="text-base font-medium text-muted-foreground">{THEMEN[thema]}</h3>
            <ul className="flex flex-col gap-3">{tools.map(zeile)}</ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function ToolZeile({
  tool,
  begriff,
  ort,
  kopiert,
  onStart,
}: {
  tool: ExternesTool;
  begriff: string;
  ort: string;
  kopiert: boolean;
  onStart: (tool: ExternesTool, url: string, art: Suche["art"]) => void;
}) {
  const b = begriff.trim();
  const direkt = b ? suchUrl(tool, b, ort) : null;
  return (
    <li data-testid="externes-tool" data-tool={tool.id}>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {tool.name}
            <Badge variant="outline" className="text-xs font-normal">
              {tool.anbieter}
            </Badge>
            {tool.suche && <Badge variant="secondary" className="text-xs font-normal">Direktsuche</Badge>}
          </CardTitle>
          <CardDescription>{tool.beschreibung}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 px-4">
          {direkt && (
            <a
              href={direkt}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm" })}
              onClick={() => onStart(tool, direkt, "direkt")}
            >
              <Search aria-hidden />
              Suchen
            </a>
          )}
          {b && !tool.suche && tool.kopierHinweis && (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm" })}
              onClick={() => onStart(tool, tool.url, "kopiert")}
            >
              <ClipboardCopy aria-hidden />
              Begriff kopieren und öffnen
            </a>
          )}
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: direkt || (b && tool.kopierHinweis) ? "outline" : "default" })}
          >
            <ExternalLink aria-hidden />
            Öffnen
          </a>
          {kopiert && (
            <span role="status" className="text-sm text-muted-foreground">
              „{b}“ kopiert. {tool.kopierHinweis}
            </span>
          )}
          {!kopiert && b && !tool.suche && tool.kopierHinweis && (
            <span className="text-sm text-muted-foreground">{tool.kopierHinweis}</span>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

function VerlaufZeile({ suche }: { suche: Suche }) {
  const tool = toolNachId(suche.toolId);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3" data-testid="verlauf-eintrag">
      <span className="tabular-nums text-sm text-muted-foreground">{formatDatumZeit(suche.zeitpunkt)}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{suche.begriff}</span>
        {suche.ort && <span className="text-muted-foreground"> in {suche.ort}</span>}
        <span className="text-muted-foreground"> · {tool?.name ?? suche.toolName}</span>
        {suche.art === "kopiert" && <span className="text-muted-foreground"> (Begriff eingefügt)</span>}
      </span>
      <a
        href={suche.url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: "sm", variant: "outline" })}
        onClick={() => {
          if (suche.art === "kopiert") void kopieren(suche.begriff);
        }}
      >
        <ExternalLink aria-hidden />
        Erneut öffnen
      </a>
    </li>
  );
}
