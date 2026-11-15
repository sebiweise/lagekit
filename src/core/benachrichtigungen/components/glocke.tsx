"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { formatZeit } from "@/lib/zeit";
import { cn } from "@/lib/utils";
import {
  alleGelesen,
  benachrichtigungen,
  einstellungenSetzen,
  SERVER_EINSTELLUNGEN,
  SERVER_VERLAUF,
  verlaufLeeren,
} from "../verlauf";
import { ART_ICON } from "./benachrichtigungen";

/**
 * Glocke in der Kopfzeile: Zahl ungelesener Benachrichtigungen und der Verlauf
 * dieses Tabs. Beim Schließen gilt alles als gelesen.
 *
 * shadcn/ui „Popover“: Esc, Klick daneben, Fokus und aria-expanded am Knopf
 * liefert Base UI.
 */
export function Glocke() {
  const verlauf = useSyncExternalStore(benachrichtigungen.abonnieren, benachrichtigungen.verlauf, SERVER_VERLAUF);
  const einstellungen = useSyncExternalStore(
    benachrichtigungen.abonnieren,
    benachrichtigungen.einstellungen,
    SERVER_EINSTELLUNGEN,
  );
  const ungelesen = verlauf.filter((b) => !b.gelesen).length;
  const [offen, setOffen] = useState(false);
  const umschalten = (neu: boolean) => {
    setOffen(neu);
    // Beim Schließen gilt alles als gelesen.
    if (!neu) alleGelesen();
  };
  const schliessen = () => umschalten(false);

  return (
    <Popover open={offen} onOpenChange={umschalten}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative shrink-0")}
        aria-label={ungelesen > 0 ? `Benachrichtigungen, ${ungelesen} ungelesen` : "Benachrichtigungen"}
        title="Benachrichtigungen"
        data-testid="glocke"
      >
        <Bell />
        {ungelesen > 0 && (
          <span
            className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs leading-5 font-semibold text-white tabular-nums"
            aria-hidden
            data-testid="glocke-zahl"
          >
            {ungelesen > 9 ? "9+" : ungelesen}
          </span>
        )}
      </PopoverTrigger>
      {/* Unter der Glocke, am rechten Rand ausgerichtet. */}
      <PopoverContent
        align="end"
        className="flex max-h-[min(70dvh,32rem)] w-[min(24rem,calc(100vw-1rem))] flex-col p-0"
        data-testid="glocke-verlauf"
      >
        <div className="flex items-center justify-between gap-2 border-b py-1 pr-1 pl-4">
          <PopoverTitle>Benachrichtigungen</PopoverTitle>
          <Button variant="ghost" size="icon" className="size-10" aria-label="Schließen" onClick={schliessen}>
            <X />
          </Button>
        </div>

        {verlauf.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Noch nichts. Hier erscheinen neue Tagebucheinträge von anderen Geräten, neue Dateien, Geräte der
            gemeinsamen Sitzung und neue Versionen.
          </p>
        ) : (
          <ul className="flex-1 divide-y overflow-y-auto">
            {verlauf.map((b) => {
              const Icon = ART_ICON[b.art];
              const inhalt = (
                <>
                  <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("leading-snug", !b.gelesen && "font-semibold")}>
                      {!b.gelesen && <span className="sr-only">Neu: </span>}
                      {b.titel}
                    </span>
                    {b.text && <span className="line-clamp-2 text-sm text-muted-foreground">{b.text}</span>}
                  </span>
                  <time className="shrink-0 text-xs text-muted-foreground tabular-nums" dateTime={b.zeit}>
                    {formatZeit(b.zeit)}
                  </time>
                </>
              );
              return (
                <li key={b.id} className={cn(!b.gelesen && "bg-accent/60")}>
                  {b.href ? (
                    <Link
                      href={b.href}
                      onClick={schliessen}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      {inhalt}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3">{inhalt}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={einstellungen.einblenden}
              onCheckedChange={(an) => einstellungenSetzen({ einblenden: an })}
              data-testid="glocke-einblenden"
            />
            Am Bildschirmrand einblenden
          </label>
          {verlauf.length > 0 && (
            <Button variant="ghost" size="sm" className="h-10 px-3" onClick={verlaufLeeren}>
              <Trash2 /> Leeren
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
