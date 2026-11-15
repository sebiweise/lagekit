"use client";

import * as React from "react";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Befehlsliste nach shadcn/ui „Command“, gebaut auf dem Base-UI-Autocomplete
 * (inline, immer offen) statt auf cmdk, damit keine zweite Bibliothek ins Bundle
 * kommt. Pfeiltasten, Enter, Gruppen und Screenreader-Ansagen liefert Base UI.
 *
 * Gefiltert wird außerhalb (`filteredItems`), damit Umlaute, Stichworte und
 * Einträge wie „„…“ suchen“ die eigene Logik nutzen.
 */
function Command<Item>({
  className,
  children,
  items,
  filteredItems,
  value,
  onValueChange,
  itemToStringValue,
}: {
  /** Gruppen mit ihren Einträgen (`{ items: [...] }`). */
  items: readonly { items: readonly Item[] }[];
  filteredItems: readonly { items: readonly Item[] }[];
  value: string;
  onValueChange: (value: string) => void;
  itemToStringValue: (item: Item) => string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AutocompletePrimitive.Root
      inline
      open
      autoHighlight="always"
      keepHighlight
      items={items}
      filteredItems={filteredItems}
      value={value}
      onValueChange={(v) => onValueChange(v)}
      itemToStringValue={(item) => itemToStringValue(item as Item)}
    >
      <div data-slot="command" className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
        {children}
      </div>
    </AutocompletePrimitive.Root>
  );
}

/** Command im Dialog oben im Bild (Strg+K). */
function CommandDialog({
  open,
  onOpenChange,
  title = "Befehle",
  description,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="command-dialog-overlay"
          className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute print:hidden"
        />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-4 sm:pt-[12vh] print:hidden">
          <DialogPrimitive.Popup
            data-slot="command-dialog"
            className={cn(
              "flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl outline-none sm:max-h-[min(40rem,80dvh)]",
              "transition-[translate,scale,opacity] duration-150 data-ending-style:-translate-y-2 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
              className,
            )}
          >
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>}
            {children}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandInput({ className, ...props }: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="command-input-wrapper"
      className="flex shrink-0 items-center gap-3 border-b px-4"
    >
      <Search className="size-6 shrink-0 text-muted-foreground" aria-hidden />
      <AutocompletePrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-16 w-full min-w-0 bg-transparent text-lg outline-none placeholder:text-muted-foreground",
          className,
        )}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        {...props}
      />
    </AutocompletePrimitive.InputGroup>
  );
}

function CommandList({ className, ...props }: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="command-list"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scroll-padding-block:0.5rem] empty:hidden", className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="command-empty"
      className={cn("px-4 py-8 text-center text-muted-foreground empty:hidden", className)}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: AutocompletePrimitive.Group.Props) {
  return <AutocompletePrimitive.Group data-slot="command-group" className={cn("not-last:mb-2", className)} {...props} />;
}

function CommandGroupLabel({ className, ...props }: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="command-group-label"
      className={cn("px-3 py-1.5 text-sm font-medium text-muted-foreground select-none", className)}
      {...props}
    />
  );
}

const CommandCollection = AutocompletePrimitive.Collection;

function CommandItem({ className, ...props }: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-base outline-none select-none [scroll-margin-block:0.5rem]",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Tastenkürzel rechts im Eintrag. */
function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex", className)}
      {...props}
    />
  );
}

/** Fußzeile mit Bedienhinweisen (nur am PC sinnvoll). */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn("hidden shrink-0 items-center gap-4 border-t px-4 py-2.5 text-sm text-muted-foreground sm:flex", className)}
      {...props}
    />
  );
}

export {
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
};
