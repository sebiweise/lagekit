"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Umschaltknopf nach shadcn/ui „Toggle“ (Base-UI-Variante). */
const toggleVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium text-muted-foreground transition-colors outline-none hover:not-data-pressed:bg-accent hover:not-data-pressed:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Gewählt: hervorgehoben wie ein Segment in einer Leiste.
        default: "data-pressed:bg-accent data-pressed:text-foreground",
        outline:
          "border bg-background text-foreground shadow-xs data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground",
        solid: "data-pressed:bg-primary data-pressed:text-primary-foreground",
      },
      size: {
        default: "h-12 min-w-12 px-4",
        sm: "h-10 min-w-10 px-3 text-sm",
        lg: "h-14 min-w-14 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
