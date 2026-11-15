"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Auf- und zuklappbarer Bereich nach shadcn/ui „Collapsible“ (Base-UI-Variante).
 * Der Inhalt bleibt beim Zuklappen erhalten (keepMounted), damit halb ausgefüllte
 * Formulare nicht verloren gehen, und ist mit der Seitensuche (Strg+F) auffindbar.
 */
function Collapsible(props: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      hiddenUntilFound
      className={cn("[&[hidden]:not([hidden='until-found'])]:hidden", className)}
      {...props}
    />
  );
}

/**
 * Zeile zum Aufklappen mit Pfeil: die übliche Form in Lagekit (Ersatz für <details>).
 * Große Trefferfläche für Touch.
 */
function CollapsibleZeile({ className, children, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/zeile flex min-h-11 w-full items-center gap-2 rounded-md text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-transform group-data-panel-open/zeile:rotate-90"
        aria-hidden
      />
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger, CollapsibleZeile };
