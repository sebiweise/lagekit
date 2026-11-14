import type { Metadata } from "next";
import { Recherche } from "@/tools/recherche/components/recherche";

export const metadata: Metadata = { title: "Externe Tools" };

export default function RecherchePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">Externe Tools</h1>
      <Recherche />
    </main>
  );
}
