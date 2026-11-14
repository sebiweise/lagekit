import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AktiverEinsatzKarte } from "@/core/einsatz/components/aktiver-einsatz-karte";
import { DeviceClock } from "@/core/pwa/components/device-clock";
import { PwaStatus } from "@/core/pwa/components/pwa-status";
import { t } from "@/i18n";
import { toolHref, toolRegistry } from "@/tools/registry";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold tracking-tight">{t.start.titel}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{t.start.untertitel}</p>
        </div>
        <DeviceClock />
      </header>

      <AktiverEinsatzKarte />

      <PwaStatus />

      <section aria-labelledby="tools-titel" className="flex flex-col gap-4">
        <h2 id="tools-titel" className="text-2xl font-semibold">
          {t.start.toolsTitel}
        </h2>
        {toolRegistry.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
            {t.start.keineTools}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolRegistry.map((tool) => (
              <li key={tool.id}>
                <Link href={toolHref(tool)} className="block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <Card className="h-full transition-colors hover:bg-accent">
                    <CardHeader>
                      <tool.icon className="size-8" aria-hidden />
                      <CardTitle>{tool.name}</CardTitle>
                      <CardDescription>{tool.beschreibung}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-auto border-t pt-4 text-sm text-muted-foreground">
        <Link href="/hinweise/" className="underline underline-offset-4 hover:text-foreground">
          {t.hinweise.link}
        </Link>
      </footer>
    </main>
  );
}
