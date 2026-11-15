import type { Metadata } from "next";
import { Arbeitsbereich } from "@/core/arbeitsbereich/components/arbeitsbereich";

export const metadata: Metadata = { title: "Arbeitsbereich" };

export default function ArbeitsbereichPage() {
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
      <h1 className="sr-only">Arbeitsbereich</h1>
      <Arbeitsbereich />
    </main>
  );
}
