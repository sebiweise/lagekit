import type { Metadata } from "next";
import { Einsatztagebuch } from "@/tools/einsatztagebuch/components/einsatztagebuch";

export const metadata: Metadata = { title: "Einsatztagebuch" };

export default function EinsatztagebuchPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Einsatztagebuch</h1>
      <Einsatztagebuch />
    </main>
  );
}
