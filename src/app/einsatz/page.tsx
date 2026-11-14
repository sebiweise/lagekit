import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EinsatzFormular } from "@/core/einsatz/components/einsatz-formular";
import { EinsatzListe } from "@/core/einsatz/components/einsatz-liste";
import { Sicherung } from "@/core/einsatz/components/sicherung";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.einsatz.titel };

export default function EinsatzPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t.einsatz.titel}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.einsatz.neu}</CardTitle>
        </CardHeader>
        <CardContent>
          <EinsatzFormular />
        </CardContent>
      </Card>

      <section aria-labelledby="einsatz-liste" className="flex flex-col gap-4">
        <h2 id="einsatz-liste" className="text-2xl font-semibold">
          {t.einsatz.liste}
        </h2>
        <EinsatzListe />
      </section>

      <section aria-labelledby="sicherung" className="flex flex-col gap-3">
        <h2 id="sicherung" className="text-2xl font-semibold">
          {t.sicherung.titel}
        </h2>
        <Sicherung />
      </section>
    </main>
  );
}
