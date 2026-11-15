import * as React from "react";

import { cn } from "@/lib/utils";

/** Taste oder Tastenkürzel nach shadcn/ui „Kbd“, z. B. <Kbd>Strg</Kbd><Kbd>K</Kbd>. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-sm border bg-muted px-1.5 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export { Kbd, KbdGroup };
