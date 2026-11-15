"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AKTUELLE_VERSION } from "@/core/aenderungen/aktuell";
import { updateUebersicht } from "@/core/aenderungen/version-info";
import { t } from "@/i18n";
import { usePwaZustand } from "../update";

const SPAETER_SCHLUESSEL = "lagekit.update-spaeter";

function spaeterGewaehlt(): string | null {
  try {
    return sessionStorage.getItem(SPAETER_SCHLUESSEL);
  } catch {
    return null;
  }
}

/**
 * Auf allen Seiten: Hinweis auf eine wartende neue Version mit Link zu den
 * Änderungen. Aktualisiert wird erst dort, nach dem Lesen.
 */
export function UpdateHinweis() {
  const pwa = usePwaZustand();
  const pfad = usePathname();
  const [ausgeblendet, setAusgeblendet] = useState<string | null>(spaeterGewaehlt);
  if (!pwa.updateWartet || pfad === "/aenderungen/") return null;

  const kennung = pwa.neueVersion ? `${pwa.neueVersion.version}+${pwa.neueVersion.commit}` : "unbekannt";
  if (ausgeblendet === kennung) return null;

  const uebersicht = pwa.neueVersion ? updateUebersicht(AKTUELLE_VERSION, pwa.neueVersion) : null;
  const datenUmbau =
    uebersicht !== null && (uebersicht.migrationen.length > 0 || uebersicht.datenHinweise.length > 0);

  return (
    <div className="border-b border-warn bg-warn/10 print:hidden" role="status" data-testid="update-hinweis">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-sm sm:px-6">
        <RefreshCw className="size-4 shrink-0" />
        <span className="font-medium">{t.aenderungen.bannerText(pwa.neueVersion?.version ?? null)}</span>
        {datenUmbau && (
          <span className="flex items-center gap-1">
            <Database className="size-4" /> {t.aenderungen.bannerDaten}
          </span>
        )}
        <Link
          href="/aenderungen/"
          className="font-medium underline underline-offset-4 hover:text-foreground"
          data-testid="update-hinweis-link"
        >
          {t.status.updateAnsehen}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 px-2"
          aria-label={t.aenderungen.spaeter}
          title={t.aenderungen.spaeter}
          onClick={() => {
            try {
              sessionStorage.setItem(SPAETER_SCHLUESSEL, kennung);
            } catch {
              // ohne Speicher nur bis zum Neuladen ausgeblendet
            }
            setAusgeblendet(kennung);
          }}
        >
          <X /> <span className="sr-only sm:not-sr-only">{t.aenderungen.spaeter}</span>
        </Button>
      </div>
    </div>
  );
}
