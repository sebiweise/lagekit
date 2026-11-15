"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MehrMenue } from "./mehr-menue";
import { istAktiv, navigationsZiele } from "./navigation";

/**
 * Navigation am unteren Rand für Handy und Tablet: mit dem Daumen erreichbar,
 * große Flächen mit Symbol und Text. Ab `lg` (PC im ELW) ausgeblendet.
 */
export function UntereLeiste() {
  const pfad = usePathname();
  const ziele = navigationsZiele();
  const unten = ziele.filter((z) => z.unten);
  const mehr = ziele.filter((z) => !z.unten);

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl" style={{ gridTemplateColumns: `repeat(${unten.length + 1}, minmax(0, 1fr))` }}>
        {unten.map((ziel) => {
          const aktiv = istAktiv(pfad, ziel.href);
          return (
            <li key={ziel.href}>
              <Link
                href={ziel.href}
                aria-current={aktiv ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground",
                  aktiv && "font-semibold text-foreground",
                )}
              >
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", aktiv && "bg-accent")}>
                  <ziel.icon className="size-6" aria-hidden />
                </span>
                {ziel.kurz ?? ziel.text}
              </Link>
            </li>
          );
        })}
        <li>
          <MehrMenue ziele={mehr} variante="unten" />
        </li>
      </ul>
    </nav>
  );
}
