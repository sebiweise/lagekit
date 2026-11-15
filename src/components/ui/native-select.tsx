import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Natives Auswahlfeld nach shadcn/ui „Native Select“: auf Tablets und Handys mit der
 * Systemauswahl, ohne Zusatzbibliothek. `size="sm"` für Kopfzeilen (z. B. Arbeitsbereich).
 */
function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("group/native-select relative w-full min-w-0 has-[select:disabled]:opacity-50", className)}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 appearance-none truncate rounded-md border border-input bg-background py-0 pr-9 pl-3 text-base shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30",
          "h-12 data-[size=sm]:h-9 data-[size=sm]:pl-2 data-[size=sm]:font-medium",
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup };
