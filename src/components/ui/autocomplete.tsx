"use client";

import * as React from "react";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";

import { cn } from "@/lib/utils";

/**
 * Freitextfeld mit Vorschlagsliste nach shadcn/ui „Combobox“ (Base-UI-Variante, hier als
 * Autocomplete: der eingetippte Text bleibt der Wert, die Liste schlägt nur vor).
 */
const Autocomplete = AutocompletePrimitive.Root;

function AutocompleteInput(props: AutocompletePrimitive.Input.Props) {
  return <AutocompletePrimitive.Input data-slot="autocomplete-input" {...props} />;
}

function AutocompleteContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<AutocompletePrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "collisionPadding">) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-50 outline-none"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
            "transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 print:hidden",
            className,
          )}
          {...props}
        />
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

function AutocompleteList({ className, ...props }: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cn("max-h-[min(18rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain outline-none data-empty:p-0", className)}
      {...props}
    />
  );
}

function AutocompleteItem({ className, ...props }: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "flex min-h-11 cursor-pointer items-center px-3 py-2 break-words outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteEmpty({ className, ...props }: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cn("px-3 py-2 text-sm text-muted-foreground empty:p-0", className)}
      {...props}
    />
  );
}

export { Autocomplete, AutocompleteContent, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList };
