import type { Metadata } from "next";
import { BetaMarke } from "@/components/beta-marke";
import { SitzungSeite } from "@/core/sync/components/sitzung-seite";

export const metadata: Metadata = { title: "Gemeinsam arbeiten" };

export default function SitzungPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Gemeinsam arbeiten <BetaMarke className="ml-1 align-middle" />
        </h1>
        <p className="text-muted-foreground">
          Mehrere Geräte arbeiten am selben Einsatz. Ein Gerät leitet die Sitzung und lässt jedes weitere Gerät zu.
          Die Daten gehen direkt von Gerät zu Gerät im lokalen Netz.
        </p>
        <p className="rounded-md border border-warn bg-warn/10 px-3 py-2 text-sm" data-testid="beta-hinweis">
          <strong>Beta:</strong> Diese Funktion wird noch erprobt. Bitte vor dem Ernstfall in einer Übung testen und
          wichtige Stände zusätzlich exportieren oder ausdrucken.
        </p>
      </div>
      <SitzungSeite />
    </main>
  );
}
