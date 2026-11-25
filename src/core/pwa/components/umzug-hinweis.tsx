"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, ExternalLink, Truck, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { einsaetzeSichern } from "@/core/einsatz/components/sicherung";
import { t } from "@/i18n";

/** Neue Adresse aus dem Build (LAGEKIT_UMZUG_URL); leer in allen anderen Installationen. */
const ZIEL = process.env.NEXT_PUBLIC_UMZUG_URL ? new URL(process.env.NEXT_PUBLIC_UMZUG_URL) : null;
/** Rechnername und Pfad ohne abschließenden Schrägstrich, z. B. „sebiweise.github.io/lagekit“. */
const ZIEL_TEXT = ZIEL ? ZIEL.host + (ZIEL.pathname.endsWith("/") ? ZIEL.pathname.slice(0, -1) : ZIEL.pathname) : "";
const SPAETER_SCHLUESSEL = "lagekit.umzug-spaeter";

function spaeterGewaehlt(): boolean {
  try {
    return sessionStorage.getItem(SPAETER_SCHLUESSEL) === "1";
  } catch {
    return false;
  }
}

/** Erst im Browser entschieden; die statische Seite enthält den Hinweis nicht. */
function anzeigen(): boolean {
  // Schon unter der neuen Adresse (gleicher Build an beiden Orten): kein Hinweis.
  return ZIEL !== null && location.origin !== ZIEL.origin && !spaeterGewaehlt();
}

const keineAenderungen = () => () => undefined;

/**
 * Nur in der alten Installation nach einem Umzug: Eine neue Adresse ist ein neuer
 * Ursprung, IndexedDB und installierte App bleiben hier. Der Hinweis führt zur
 * Sicherung und zur neuen Adresse; „Später“ blendet ihn bis zum nächsten Start aus.
 */
export function UmzugHinweis() {
  const sichtbar = useSyncExternalStore(keineAenderungen, anzeigen, () => false);
  const [ausgeblendet, setAusgeblendet] = useState(false);
  if (!ZIEL || !sichtbar || ausgeblendet) return null;

  return (
    <div className="border-b border-warn bg-warn/10 print:hidden" role="status" data-testid="umzug-hinweis">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-sm sm:px-6">
        <Truck className="size-4 shrink-0" />
        <span className="font-medium">{t.umzug.text(ZIEL_TEXT)}</span>
        <span>{t.umzug.daten}</span>
        <Button variant="outline" size="sm" className="h-8" onClick={() => void einsaetzeSichern()}>
          <Download /> {t.umzug.sichern}
        </Button>
        <a
          href={ZIEL.href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-8" })}
        >
          <ExternalLink /> {t.umzug.oeffnen}
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 px-2"
          aria-label={t.umzug.spaeter}
          title={t.umzug.spaeter}
          onClick={() => {
            try {
              sessionStorage.setItem(SPAETER_SCHLUESSEL, "1");
            } catch {
              // ohne Speicher nur bis zum Neuladen ausgeblendet
            }
            setAusgeblendet(true);
          }}
        >
          <X /> <span className="sr-only sm:not-sr-only">{t.umzug.spaeter}</span>
        </Button>
      </div>
    </div>
  );
}
