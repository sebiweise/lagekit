"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { BetaMarke } from "@/components/beta-marke";
import { buttonVariants } from "@/components/ui/button";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { t } from "@/i18n";
import { useJetzt } from "@/lib/use-jetzt";
import { cn } from "@/lib/utils";
import { formatDauer, formatZeit } from "@/lib/zeit";
import { MehrMenue } from "./mehr-menue";
import { istAktiv, navigationsZiele } from "./navigation";

const uhrFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Kopfzeile auf allen Seiten, bleibt beim Scrollen stehen: der aktive Einsatz mit
 * Laufzeit und die Gerätezeit. Am PC zusätzlich die Navigation; auf Handy und
 * Tablet liegt sie unten (siehe UntereLeiste).
 */
export function AppHeader() {
  const pfad = usePathname();
  const ziele = navigationsZiele();
  const oben = ziele.filter((z) => z.oben);
  const mehr = ziele.filter((z) => !z.oben);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="hidden shrink-0 text-lg font-bold lg:block">
          {t.app.name}
        </Link>
        <EinsatzAnzeige />
        <Uhr />
      </div>
      <nav aria-label="Hauptnavigation" className="hidden border-t lg:block">
        <ul className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-1 sm:px-6">
          {oben.map((ziel) => {
            const aktiv = istAktiv(pfad, ziel.href);
            return (
              <li key={ziel.href}>
                <Link
                  href={ziel.href}
                  aria-current={aktiv ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-md px-3 text-base whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground",
                    aktiv && "bg-accent font-semibold text-foreground",
                  )}
                >
                  <ziel.icon className="size-5 shrink-0" aria-hidden />
                  {/* Bei knapper Breite der Kurzname; ausgeblendeter Text zählt nicht zum Namen des Links. */}
                  {ziel.kurz ? (
                    <>
                      <span className="xl:hidden">{ziel.kurz}</span>
                      <span className="hidden xl:inline">{ziel.text}</span>
                    </>
                  ) : (
                    ziel.text
                  )}
                  {ziel.beta && <BetaMarke />}
                </Link>
              </li>
            );
          })}
          {mehr.length > 0 && (
            <li className="ml-auto">
              <MehrMenue ziele={mehr} variante="oben" />
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

/** Stichwort, Ort und Laufzeit des aktiven Einsatzes; ohne Einsatz ein deutlicher Hinweis. */
function EinsatzAnzeige() {
  const einsatz = useAktiverEinsatz();
  const jetzt = useJetzt();

  if (einsatz === undefined) return <div className="min-w-0 flex-1" />;
  if (einsatz === null) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AlertTriangle className="size-5 shrink-0 text-warn-foreground dark:text-warn" aria-hidden />
        <span className="truncate font-semibold" data-testid="kopf-einsatz">
          {t.nav.keinEinsatz}
        </span>
        <Link href="/einsatz/" className={cn(buttonVariants({ size: "sm" }), "ml-auto")} aria-label="Einsatz anlegen">
          <Plus /> Anlegen
        </Link>
      </div>
    );
  }

  const minuten = jetzt ? (jetzt.getTime() - new Date(einsatz.beginn).getTime()) / 60_000 : null;
  return (
    <Link href="/einsatz/" className="group flex min-w-0 flex-1 flex-col rounded-md py-0.5" title="Einsatz verwalten">
      <span className="truncate text-lg leading-tight font-bold group-hover:underline" data-testid="kopf-einsatz">
        {einsatz.stichwort}
      </span>
      <span className="truncate text-sm text-muted-foreground">
        {[minuten !== null && minuten >= 0 ? formatDauer(minuten) : null, `seit ${formatZeit(einsatz.beginn)}`, einsatz.ort]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </Link>
  );
}

/** Gerätezeit, damit eine falsch gehende Uhr sofort auffällt (alle Zeitstempel kommen von ihr). */
function Uhr() {
  const jetzt = useJetzt();
  return (
    <div className="shrink-0 text-right" aria-live="off">
      <time
        className="block font-mono text-xl leading-tight font-semibold tabular-nums sm:text-2xl"
        dateTime={jetzt?.toISOString()}
        data-testid="geraetezeit"
      >
        {jetzt ? uhrFormat.format(jetzt) : "--:--:--"}
      </time>
      <span className="block text-xs text-muted-foreground">{t.status.geraetezeit}</span>
    </div>
  );
}
