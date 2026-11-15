import { Suspense } from "react";
import type { Metadata } from "next";
import { BerichtAnsicht } from "@/core/export/components/bericht-ansicht";

export const metadata: Metadata = { title: "Einsatzbericht" };

export default function BerichtPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <h1 className="text-3xl font-bold tracking-tight print:hidden">Einsatzbericht</h1>
      <Suspense>
        <BerichtAnsicht />
      </Suspense>
    </main>
  );
}
