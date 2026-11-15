import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pfadangabe nach shadcn/ui „Breadcrumb“. Einträge können Links oder Knöpfe sein. */
function Breadcrumb({ "aria-label": label = "Pfad", ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label={label} data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("flex flex-wrap items-center gap-1 text-sm break-words text-muted-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

/** Knopf als Eintrag (Navigation innerhalb der Seite, ohne Adresswechsel). */
function BreadcrumbButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="breadcrumb-link"
      className={cn(
        "min-h-10 rounded-md px-2 text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("px-2 font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("[&>svg]:size-4", className)} {...props}>
      {children ?? <ChevronRight />}
    </li>
  );
}

export { Breadcrumb, BreadcrumbButton, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
