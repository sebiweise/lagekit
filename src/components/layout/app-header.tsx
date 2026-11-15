"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BetaMarke } from "@/components/beta-marke";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** Kopfzeile auf allen Seiten: Navigation und der aktive Einsatz. */
export function AppHeader() {
  const pfad = usePathname();
  const einsatz = useAktiverEinsatz();
  const links = [
    { href: "/", text: t.nav.start },
    { href: "/einsatz/", text: t.nav.einsatz },
    { href: "/suche/", text: t.nav.suche },
    { href: "/arbeitsbereich/", text: t.nav.arbeitsbereich },
    { href: "/sitzung/", text: t.nav.sitzung, beta: true },
  ];

  return (
    <header className="border-b bg-card print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="text-lg font-bold">
          {t.app.name}
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pfad === link.href ? "page" : undefined}
              className={cn(
                "flex h-11 items-center rounded-md px-3 text-base hover:bg-accent",
                pfad === link.href && "bg-accent font-medium",
              )}
            >
              {link.text}
              {link.beta && <BetaMarke className="ml-1.5" />}
            </Link>
          ))}
        </nav>
        <Link
          href="/einsatz/"
          className="ml-auto truncate text-sm text-muted-foreground hover:text-foreground"
          data-testid="kopf-einsatz"
        >
          {einsatz ? einsatz.stichwort : einsatz === null ? t.nav.keinEinsatz : ""}
        </Link>
      </div>
    </header>
  );
}
