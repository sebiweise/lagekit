import type { Metadata } from "next";
import { Karte } from "@/tools/karte/components/karte";

export const metadata: Metadata = { title: "Karte" };

export default function KartePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">Karte</h1>
      <Karte />
    </main>
  );
}
