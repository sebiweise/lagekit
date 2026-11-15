"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Blatt vom Bildschirmrand nach shadcn/ui „Sheet“ (Base-UI-Dialog). Fürs Handy
 * meist `side="bottom"`; berücksichtigt die Ränder der iPhone-Anzeige.
 */
function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

const SEITE = {
  bottom:
    "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] data-ending-style:translate-y-full data-starting-style:translate-y-full",
  top: "inset-x-0 top-0 max-h-[90dvh] rounded-b-2xl border-b pt-[env(safe-area-inset-top)] data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
  left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-ending-style:translate-x-full data-starting-style:translate-x-full",
} as const;

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & { side?: keyof typeof SEITE; showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute print:hidden"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col overflow-y-auto bg-card text-card-foreground shadow-lg outline-none transition-transform duration-200 ease-out print:hidden",
          SEITE[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" size="icon" className="absolute top-1 right-2" />}
            aria-label="Schließen"
          >
            <X />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex min-h-14 flex-col justify-center gap-1 border-b py-2 pr-16 pl-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-lg font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger };
