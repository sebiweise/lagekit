"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, Menu, X } from "lucide-react";
import { BetaMarke } from "@/components/beta-marke";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { externeLinks, istAktiv, websiteLinks, type NavZiel } from "./navigation";

/**
 * „Mehr“: alle Ziele, die nicht direkt in der Leiste stehen, als große Zeilen.
 * Als Blatt von unten (nur Handy und Tablet). Natives <dialog>,
 * damit Fokus, Esc und Hintergrund ohne eigene Logik funktionieren.
 */
export function MehrMenue({ ziele }: { ziele: NavZiel[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pfad = usePathname();
  const aktiv = ziele.some((z) => istAktiv(pfad, z.href));

  function oeffnen() {
    dialog.current?.showModal();
  }
  function schliessen() {
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={oeffnen}
        aria-haspopup="dialog"
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium text-muted-foreground",
          aktiv && "text-foreground",
        )}
      >
        <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", aktiv && "bg-accent")}>
          <Menu className="size-6" aria-hidden />
        </span>
        Mehr
      </button>
      <dialog
        ref={dialog}
        aria-label="Weitere Bereiche"
        onClick={(e) => {
          // Klick auf den abgedunkelten Hintergrund schließt.
          if (e.target === dialog.current) schliessen();
        }}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-lg font-semibold">Mehr</h2>
          <Button variant="ghost" size="icon" onClick={schliessen} aria-label="Schließen">
            <X />
          </Button>
        </div>
        <ul className="flex flex-col p-2">
          {ziele.map((ziel) => (
            <li key={ziel.href}>
              <Link
                href={ziel.href}
                onClick={schliessen}
                aria-current={istAktiv(pfad, ziel.href) ? "page" : undefined}
                className="flex min-h-16 items-center gap-4 rounded-lg px-3 py-2 hover:bg-accent aria-[current=page]:bg-accent"
              >
                <ziel.icon className="size-7 shrink-0" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-lg font-medium">
                    {ziel.text}
                    {ziel.beta && <BetaMarke />}
                  </span>
                  {ziel.beschreibung && (
                    <span className="line-clamp-1 text-sm text-muted-foreground">{ziel.beschreibung}</span>
                  )}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        {/* Website und GitHub: kompakt nebeneinander, damit das Blatt auf das Handy passt. */}
        <ul className="grid grid-cols-2 gap-2 border-t p-2">
          {websiteLinks.map((ziel) => (
            <li key={ziel.href}>
              <Link
                href={ziel.href}
              prefetch={false}
                onClick={schliessen}
                className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ziel.icon className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">{ziel.text}</span>
              </Link>
            </li>
          ))}
          {externeLinks.map((ziel) => (
            <li key={ziel.href}>
              <a
                href={ziel.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={schliessen}
                className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ziel.icon className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">{ziel.text}</span>
                <ExternalLink className="size-4 shrink-0" aria-label="öffnet in neuem Tab" />
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
