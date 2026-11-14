import * as React from "react";

import { cn } from "@/lib/utils";

/** Natives Auswahlfeld: auf Tablets mit Systemauswahl, ohne Zusatzbibliothek. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
