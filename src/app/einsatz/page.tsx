import type { Metadata } from "next";
import { EinsatzListe } from "@/core/einsatz/components/einsatz-liste";
import { NeuerEinsatz } from "@/core/einsatz/components/neuer-einsatz";
import { Sicherung } from "@/core/einsatz/components/sicherung";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.einsatz.titel };

export default function EinsatzPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.einsatz.titel}</h1>

      <NeuerEinsatz />

      <section aria-labelledby="einsatz-liste" className="flex flex-col gap-3">
        <h2 id="einsatz-liste" className="text-xl font-semibold">
          {t.einsatz.liste}
        </h2>
        <EinsatzListe />
      </section>

      <section aria-labelledby="sicherung" className="flex flex-col gap-3">
        <h2 id="sicherung" className="text-xl font-semibold">
          {t.sicherung.titel}
        </h2>
        <Sicherung />
      </section>
    </main>
  );
}
