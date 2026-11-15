import type { Metadata } from "next";
import { Aenderungen } from "@/core/aenderungen/components/aenderungen";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.aenderungen.titel };

export default function AenderungenPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.aenderungen.titel}</h1>
      <Aenderungen />
    </main>
  );
}
