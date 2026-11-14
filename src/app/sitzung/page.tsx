import type { Metadata } from "next";
import { SitzungSeite } from "@/core/sync/components/sitzung-seite";

export const metadata: Metadata = { title: "Gemeinsam arbeiten" };

export default function SitzungPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gemeinsam arbeiten</h1>
        <p className="text-muted-foreground">
          Mehrere Geräte arbeiten am selben Einsatz. Ein Gerät leitet die Sitzung und lässt jedes weitere Gerät zu.
          Die Daten gehen direkt von Gerät zu Gerät im lokalen Netz.
        </p>
      </div>
      <SitzungSeite />
    </main>
  );
}
