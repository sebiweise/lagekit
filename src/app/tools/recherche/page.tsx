import type { Metadata } from "next";
import { Linksammlung } from "@/tools/recherche/components/linksammlung";

export const metadata: Metadata = { title: "Externe Tools" };

export default function ExterneToolsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">Externe Tools</h1>
      <Linksammlung />
    </main>
  );
}
