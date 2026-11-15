"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";

import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

/**
 * Gruppe von Umschaltknöpfen nach shadcn/ui „Toggle Group“ (Base-UI-Variante),
 * z. B. als Segmentleiste für eine Auswahl aus wenigen Möglichkeiten.
 * Pfeiltasten wechseln zwischen den Knöpfen.
 */
const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        "flex w-fit items-center gap-0.5 rounded-md",
        variant !== "outline" && "border bg-card p-0.5",
        variant === "outline" && "gap-2",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const kontext = React.useContext(ToggleGroupContext);
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ variant: kontext.variant ?? variant, size: kontext.size ?? size }),
        kontext.variant !== "outline" && "rounded-sm",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
