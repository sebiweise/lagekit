import type { Metadata } from "next";
import { Dateibrowser } from "@/tools/dateien/components/dateibrowser";

export const metadata: Metadata = { title: "Dateien" };

export default function DateienPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dateien</h1>
      <Dateibrowser />
    </main>
  );
}
