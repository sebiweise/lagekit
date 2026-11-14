import type { Metadata } from "next";
import { Strahlenexposition } from "@/tools/strahlenexposition/components/strahlenexposition";

export const metadata: Metadata = { title: "Strahlenexposition" };

export default function StrahlenexpositionPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">Strahlenexposition</h1>
      <Strahlenexposition />
    </main>
  );
}
