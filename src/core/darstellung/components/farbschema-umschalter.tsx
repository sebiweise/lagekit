"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { FARBSCHEMA_REIHENFOLGE, type Farbschema } from "../farbschema";
import { useFarbschema } from "../use-farbschema";

const ICON = { system: Monitor, hell: Sun, dunkel: Moon } satisfies Record<Farbschema, unknown>;

/**
 * Wahl der Darstellung: System, Hell oder Dunkel. Eigenständig, damit sie
 * überall eingehängt werden kann (Startseite, später ein Menü).
 */
export function FarbschemaUmschalter({ className }: { className?: string }) {
  const { wahl, setzen } = useFarbschema();
  return (
    <div
      role="radiogroup"
      aria-label={t.darstellung.titel}
      className={cn("inline-flex rounded-md border bg-card p-0.5", className)}
      data-testid="farbschema"
      data-farbschema={wahl}
    >
      {FARBSCHEMA_REIHENFOLGE.map((option) => {
        const Icon = ICON[option];
        const aktiv = wahl === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => setzen(option)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-sm px-3 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              aktiv && "bg-accent font-medium text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t.darstellung[option]}
          </button>
        );
      })}
    </div>
  );
}
