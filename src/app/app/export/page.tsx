import { Suspense } from "react";
import type { Metadata } from "next";
import { EinsatzExport } from "@/core/export/components/einsatz-export";

export const metadata: Metadata = { title: "Export, Druck und Mail" };

export default function ExportPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Export, Druck und Mail</h1>
      {/* Suspense: Die Einsatz-Auswahl kommt aus der Adresse (?einsatz=…), im statischen Export erst im Browser. */}
      <Suspense>
        <EinsatzExport />
      </Suspense>
    </main>
  );
}
