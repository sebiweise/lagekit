"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { t } from "@/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
    <ToggleGroup
      aria-label={t.darstellung.titel}
      size="sm"
      className={className}
      data-testid="farbschema"
      data-farbschema={wahl}
      value={[wahl]}
      onValueChange={(wert) => {
        const neu = wert[0] as Farbschema | undefined;
        if (neu) setzen(neu);
      }}
    >
      {FARBSCHEMA_REIHENFOLGE.map((option) => {
        const Icon = ICON[option];
        return (
          <ToggleGroupItem key={option} value={option} className="gap-1.5">
            <Icon className="size-4" aria-hidden />
            {t.darstellung[option]}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
