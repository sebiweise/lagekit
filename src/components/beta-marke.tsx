import { cn } from "@/lib/utils";

/** Kleine Kennzeichnung für Funktionen, die noch erprobt werden. */
export function BetaMarke({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-warn bg-warn/15 px-1.5 py-0.5 text-xs font-semibold uppercase leading-none tracking-wide",
        className,
      )}
    >
      Beta
    </span>
  );
}
