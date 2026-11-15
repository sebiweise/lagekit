"use client";

import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Glocke } from "@/core/benachrichtigungen/components/glocke";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { t } from "@/i18n";
import { useJetzt } from "@/lib/use-jetzt";
import { cn } from "@/lib/utils";
import { formatDauer, formatZeit } from "@/lib/zeit";

const uhrFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Kopfzeile auf allen Seiten, bleibt beim Scrollen stehen: der aktive Einsatz mit
 * Laufzeit und die Gerätezeit. Die Navigation steht am PC links (Seitenleiste),
 * auf Handy und Tablet unten (UntereLeiste). Auf schmalen Handys (unter `sm`) rücken
 * die Teile enger zusammen und die Uhr wird kleiner, damit der Einsatz lesbar bleibt.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
      <div className="flex h-15 w-full items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-16 lg:pl-0">
        <Link href="/" className="hidden w-60 shrink-0 px-6 text-xl font-bold lg:block">
          {t.app.name}
        </Link>
        <EinsatzAnzeige />
        <Glocke />
        <Uhr />
      </div>
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
        {/* Am Handy darf der Hinweis zweizeilig werden, statt auf „K…“ gekürzt zu werden. */}
        <span
          className="line-clamp-2 min-w-0 text-sm leading-tight font-semibold sm:truncate sm:text-base"
          data-testid="kopf-einsatz"
        >
          {t.nav.keinEinsatz}
        </span>
        <Link
          href="/einsatz/"
          className={cn(buttonVariants({ size: "sm" }), "ml-auto max-sm:size-10 max-sm:px-0")}
          aria-label="Einsatz anlegen"
          title="Einsatz anlegen"
        >
          <Plus />
          <span className="max-sm:sr-only">Anlegen</span>
        </Link>
      </div>
    );
  }

  const minuten = jetzt ? (jetzt.getTime() - new Date(einsatz.beginn).getTime()) / 60_000 : null;
  return (
    <Link href="/einsatz/" className="group flex min-w-0 flex-1 flex-col rounded-md py-0.5" title="Einsatz verwalten">
      <span className="truncate text-base leading-tight font-bold group-hover:underline sm:text-lg" data-testid="kopf-einsatz">
        {einsatz.stichwort}
      </span>
      <span className="truncate text-xs text-muted-foreground sm:text-sm">
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
        className="block font-mono text-base leading-tight font-semibold tabular-nums sm:text-2xl"
        dateTime={jetzt?.toISOString()}
        data-testid="geraetezeit"
      >
        {jetzt ? uhrFormat.format(jetzt) : "--:--:--"}
      </time>
      <span className="block text-[0.6875rem] leading-tight text-muted-foreground sm:text-xs">{t.status.geraetezeit}</span>
    </div>
  );
}
