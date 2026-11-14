import type { Metadata } from "next";
import { Einsatztagebuch } from "@/tools/einsatztagebuch/components/einsatztagebuch";

export const metadata: Metadata = { title: "Einsatztagebuch" };

export default function EinsatztagebuchPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">Einsatztagebuch</h1>
      <Einsatztagebuch />
    </main>
  );
}
