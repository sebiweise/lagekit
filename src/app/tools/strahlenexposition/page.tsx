import type { Metadata } from "next";
import { Strahlenexposition } from "@/tools/strahlenexposition/components/strahlenexposition";

export const metadata: Metadata = { title: "Strahlenexposition" };

export default function StrahlenexpositionPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 2xl:max-w-[100rem] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Strahlenexposition</h1>
      <Strahlenexposition />
    </main>
  );
}
