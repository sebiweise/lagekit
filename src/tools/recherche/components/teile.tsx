"use client";

import { useState } from "react";
import {
  Car,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  MapPin,
  Phone,
  Radiation,
  Trees,
  TriangleAlert,
  Waves,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/core/db/db";
import type { Einsatz } from "@/core/einsatz/schema";
import { useOnline } from "@/core/pwa/components/use-online";
import { cn } from "@/lib/utils";
import { formatDatumZeit } from "@/lib/zeit";
import { toolNachId, type ExternesTool, type Thema } from "../katalog";
import { sucheSpeichern } from "../repository";
import type { Suche } from "../schema";

export const THEMA_ICON: Record<Thema, LucideIcon> = {
  gefahrstoff: FlaskConical,
  strahlung: Radiation,
  fahrzeug: Car,
  vegetation: Trees,
  wasser: Waves,
  warnung: TriangleAlert,
  kontakt: Phone,
  karte: MapPin,
};

export async function kopieren(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Hinweis, wenn kein Netz da ist: Die Ziele brauchen Internet, Lagekit selbst nicht. */
export function OfflineHinweis() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg border border-warn bg-warn/15 p-3">
      <WifiOff className="size-5 shrink-0" aria-hidden />
      Kein Netz: Die externen Tools brauchen Internet. Der Suchverlauf bleibt lesbar.
    </p>
  );
}

/** Speichert eine gestartete Suche beim Einsatz; ohne Einsatz passiert nichts. */
export function sucheMerken(
  einsatz: Einsatz | null,
  tool: ExternesTool,
  daten: { begriff: string; ort: string; url: string; art: Suche["art"] },
) {
  if (!einsatz || !daten.begriff.trim()) return;
  void sucheSpeichern(getDb(), { einsatzId: einsatz.id, toolId: tool.id, toolName: tool.name, ...daten });
}

/** Eine ganze Zeile als Link: Symbol, Name, Untertitel, Pfeil. Große Tippfläche. */
export function ZielZeile({
  tool,
  href,
  untertitel,
  onClick,
  testId,
}: {
  tool: ExternesTool;
  href: string;
  untertitel: React.ReactNode;
  onClick?: () => void;
  testId?: string;
}) {
  const Icon = THEMA_ICON[tool.themen[0]];
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        data-tool={tool.id}
        data-testid={testId}
        className="flex min-h-14 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{tool.name}</span>
          <span className="block text-sm text-muted-foreground">{untertitel}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </a>
    </li>
  );
}

export function Liste({ children, className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)} {...props}>
      {children}
    </ul>
  );
}

const VERLAUF_KURZ = 5;

export function Suchverlauf({ verlauf }: { verlauf: Suche[] }) {
  const [alle, setAlle] = useState(false);
  if (verlauf.length === 0) {
    return <p className="text-muted-foreground">Noch keine Suche in diesem Einsatz.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <Liste data-testid="suchverlauf">
        {(alle ? verlauf : verlauf.slice(0, VERLAUF_KURZ)).map((s) => (
          <VerlaufZeile key={s.id} suche={s} />
        ))}
      </Liste>
      {verlauf.length > VERLAUF_KURZ && (
        <button
          type="button"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
          onClick={() => setAlle((x) => !x)}
        >
          {alle ? "Weniger anzeigen" : `Alle ${verlauf.length} Suchen anzeigen`}
        </button>
      )}
    </div>
  );
}

function VerlaufZeile({ suche }: { suche: Suche }) {
  const tool = toolNachId(suche.toolId);
  return (
    <li data-testid="verlauf-eintrag">
      <a
        href={suche.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (suche.art === "kopiert") void kopieren(suche.begriff);
        }}
        className="flex min-h-14 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            {suche.begriff}
            {suche.ort && <span className="font-normal text-muted-foreground"> in {suche.ort}</span>}
          </span>
          <span className="block text-sm text-muted-foreground">
            {tool?.name ?? suche.toolName} · {formatDatumZeit(suche.zeitpunkt)}
            {suche.art === "kopiert" && " · Begriff wird kopiert"}
          </span>
        </span>
        <ExternalLink className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </a>
    </li>
  );
}
