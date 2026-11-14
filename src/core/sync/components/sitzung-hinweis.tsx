"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { useSitzung } from "../hooks";
import { Freigabe } from "./sitzung-host";
import { TeilnehmerAngaben } from "./teilnehmer-zeile";

/**
 * Auf allen Seiten sichtbar: Status der Sitzung und offene Beitrittsanfragen,
 * damit der Host keine Anfrage übersieht.
 */
export function SitzungHinweis() {
  const sitzung = useSitzung();
  const pfad = usePathname();
  if (!sitzung) return null;

  if (sitzung.rolle === "host") {
    const offen = pfad === "/sitzung/" ? [] : sitzung.offeneAnfragen;
    return (
      <div className="border-b bg-muted/50 print:hidden">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-2 sm:px-6">
          <Link href="/sitzung/" className="flex items-center gap-2 text-sm" data-testid="sitzung-status">
            <Users className="size-4" /> Sitzung aktiv: {sitzung.verbunden.length} Gerät
            {sitzung.verbunden.length === 1 ? "" : "e"} verbunden
            {sitzung.kurzcode && ` · Kurzcode ${sitzung.kurzcode}`}
          </Link>
          {offen.map((gast) => (
            <div
              key={gast.anfrageId}
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-warn bg-warn/10 p-3"
            >
              <div>
                <p className="text-sm font-medium">Beitrittsanfrage</p>
                <TeilnehmerAngaben teilnehmer={gast.teilnehmer} />
              </div>
              <Freigabe sitzung={sitzung} gast={gast} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const verbunden = sitzung.status === "verbunden";
  const getrennt = sitzung.status === "getrennt" || sitzung.status === "abgelehnt";
  return (
    <div className={getrennt ? "border-b border-warn bg-warn/10 print:hidden" : "border-b bg-muted/50 print:hidden"}>
      <div className="mx-auto w-full max-w-5xl px-4 py-2 sm:px-6">
        <Link href="/sitzung/" className="flex items-center gap-2 text-sm" data-testid="sitzung-status">
          <Users className="size-4" />
          {verbunden
            ? `Verbunden mit ${sitzung.teilnehmer[0]?.name ?? "Host"} · ${sitzung.teilnehmer.length} Geräte`
            : getrennt
              ? (sitzung.meldung ?? "Nicht mehr verbunden")
              : "Beitritt läuft …"}
        </Link>
      </div>
    </div>
  );
}
