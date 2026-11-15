import type { Metadata } from "next";
import { Linksammlung } from "@/tools/recherche/components/linksammlung";

export const metadata: Metadata = { title: "Externe Tools" };

export default function ExterneToolsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Externe Tools</h1>
      <Linksammlung />
    </main>
  );
}
