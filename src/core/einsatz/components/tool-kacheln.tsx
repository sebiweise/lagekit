"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { kurzstatus } from "@/tools/kurzstatus";
import { toolHref, toolRegistry } from "@/tools/registry";
import { useAktiverEinsatz } from "../hooks";

/** Große Kacheln je Tool; mit aktivem Einsatz zeigt jede Kachel den aktuellen Stand statt der Beschreibung. */
export function ToolKacheln() {
  const einsatz = useAktiverEinsatz();

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {toolRegistry.map((tool) => {
        const Status = einsatz ? kurzstatus[tool.id] : undefined;
        return (
          <li key={tool.id} className="min-w-0">
            <Link
              href={toolHref(tool)}
              className="flex h-full min-h-28 items-center gap-4 rounded-xl border bg-card p-4 shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-accent"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <tool.icon className="size-8" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xl font-semibold">{tool.name}</span>
                {Status && einsatz ? (
                  <Status einsatzId={einsatz.id} />
                ) : (
                  <span className="line-clamp-2 text-sm text-muted-foreground">{tool.beschreibung}</span>
                )}
              </span>
              <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
