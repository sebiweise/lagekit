"use client";

import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Feldbausteine nach shadcn/ui „Field“ (https://ui.shadcn.com/docs/components/field),
// für Formulare mit react-hook-form und zod. Abstände an die übrige App angepasst.

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn("mb-2 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base", className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("group/field-group @container/field-group flex w-full flex-col gap-4", className)}
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full min-w-0 gap-2 data-[invalid=true]:text-destructive", {
  variants: {
    orientation: {
      vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
      horizontal: "flex-row items-center [&>[data-slot=field-label]]:flex-auto",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="field-content" className={cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", className)} {...props} />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("group/field-label peer/field-label w-fit group-data-[disabled=true]/field:opacity-50", className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-xs leading-normal font-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

/** Fehlermeldung eines Felds; zeigt `children` oder die Meldungen aus `errors` (z. B. `fieldState.error`). */
function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const inhalt = useMemo(() => {
    if (children) return children;
    const meldungen = [...new Set((errors ?? []).map((e) => e?.message).filter((m): m is string => !!m))];
    if (meldungen.length === 0) return null;
    if (meldungen.length === 1) return meldungen[0];
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {meldungen.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    );
  }, [children, errors]);

  if (!inhalt) return null;
  return (
    <div role="alert" data-slot="field-error" className={cn("text-sm font-normal text-destructive", className)} {...props}>
      {inhalt}
    </div>
  );
}

export { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet };
