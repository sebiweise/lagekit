import type { Metadata } from "next";
import { Karte } from "@/tools/karte/components/karte";

export const metadata: Metadata = { title: "Karte" };

export default function KartePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Karte</h1>
      <Karte />
    </main>
  );
}
