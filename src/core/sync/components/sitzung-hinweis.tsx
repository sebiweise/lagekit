"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useEffect } from "react";
import Link from "next/link";
import { getDb } from "@/core/db/db";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { useSitzung } from "../hooks";
import { sitzungen } from "../sitzung";
import { vermittlung } from "../vermittlung";
import { Freigabe } from "./sitzung-host";
import { TeilnehmerAngaben } from "./teilnehmer-zeile";

/**
 * Auf allen Seiten sichtbar: Status der Sitzung und offene Beitrittsanfragen,
 * damit der Host keine Anfrage übersieht.
 */
export function SitzungHinweis() {
  const sitzung = useSitzung();
  const pfad = usePathname();
  // Eine Sitzung übersteht das Neuladen der Seite.
  useEffect(() => {
    void sitzungen.wiederherstellen(getDb(), vermittlung);
  }, []);
  if (!sitzung) {
    if (!sitzungen.andererTab()) return null;
    return (
      <div className="border-b border-warn bg-warn/10 print:hidden" role="status" data-testid="sitzung-anderer-tab">
        <p className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2 text-sm sm:px-6">
          <Users className="size-4 shrink-0" />
          „Gemeinsam arbeiten“ läuft in einem anderen Tab. Änderungen in diesem Tab werden nicht abgeglichen. Bitte
          dort weiterarbeiten.
        </p>
      </div>
    );
  }

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
  const getrennt = sitzung.status !== "verbunden" && sitzung.meldung !== null;
  return (
    <div className={getrennt ? "border-b border-warn bg-warn/10 print:hidden" : "border-b bg-muted/50 print:hidden"}>
      <div className="mx-auto w-full max-w-5xl px-4 py-2 sm:px-6">
        <Link href="/sitzung/" className="flex items-center gap-2 text-sm" data-testid="sitzung-status">
          <Users className="size-4" />
          {verbunden
            ? `Verbunden mit ${sitzung.teilnehmer[0]?.name ?? "Host"} · ${sitzung.teilnehmer.length} Geräte`
            : getrennt
              ? sitzung.meldung
              : "Beitritt läuft …"}
        </Link>
      </div>
    </div>
  );
}
