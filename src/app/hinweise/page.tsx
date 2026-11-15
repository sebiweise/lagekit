import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.hinweise.titel };

const abschnitte = [
  [t.hinweise.haftungTitel, t.hinweise.haftung],
  [t.hinweise.datenTitel, t.hinweise.daten],
  [t.hinweise.datenverlustTitel, t.hinweise.datenverlust],
  [t.hinweise.lizenzTitel, t.hinweise.lizenz],
] as const;

export default function HinweisePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.hinweise.titel}</h1>
      {abschnitte.map(([titel, text]) => (
        <section key={titel} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{titel}</h2>
          <p className="text-lg leading-relaxed">{text}</p>
        </section>
      ))}
      <Link href="/" className="mt-4 underline underline-offset-4">
        {t.hinweise.zurueck}
      </Link>
    </main>
  );
}
