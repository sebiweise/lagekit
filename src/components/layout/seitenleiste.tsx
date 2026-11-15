"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BetaMarke } from "@/components/beta-marke";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { externeLinks, istAktiv, navigationsZiele } from "./navigation";

/**
 * Navigation am PC im ELW (ab `lg`): feste Spalte links mit allen Zielen,
 * nichts versteckt hinter „Mehr“. Wächst mit neuen Tools nach unten statt zur Seite.
 */
export function Seitenleiste() {
  const pfad = usePathname();
  const ziele = navigationsZiele();
  const haupt = ziele.filter((z) => z.href !== "/hinweise/");
  const hinweise = ziele.find((z) => z.href === "/hinweise/");

  return (
    <nav
      aria-label="Hauptnavigation"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col justify-between self-start overflow-y-auto border-r px-3 py-4 lg:flex print:hidden"
    >
      <ul className="flex flex-col gap-1">
        {haupt.map((ziel) => {
          const aktiv = istAktiv(pfad, ziel.href);
          return (
            <li key={ziel.href}>
              <Link
                href={ziel.href}
                aria-current={aktiv ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground hover:bg-accent hover:text-foreground",
                  aktiv && "bg-accent font-semibold text-foreground",
                )}
              >
                <ziel.icon className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">{ziel.text}</span>
                {ziel.beta && <BetaMarke />}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-6 flex flex-col">
        {hinweise && (
          <li>
            <Link
              href={hinweise.href}
              aria-current={istAktiv(pfad, hinweise.href) ? "page" : undefined}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <hinweise.icon className="size-4 shrink-0" aria-hidden />
              {hinweise.text}
            </Link>
          </li>
        )}
        {externeLinks.map((ziel) => (
          <li key={ziel.href}>
            <a
              href={ziel.href}
              target="_blank"
              rel="noopener noreferrer"
              title={ziel.beschreibung}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ziel.icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{ziel.text}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-label="öffnet in neuem Tab" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
