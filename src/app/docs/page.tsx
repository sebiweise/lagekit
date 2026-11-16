import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DokuNavigation } from "@/components/site/doku-navigation";
import { DOKU, dokuHref } from "@/site/doku-liste";

export const metadata: Metadata = {
  title: "Dokumentation",
  description: "Lagekit selbst betreiben (Docker, Webserver, Vercel, Cloudflare), Bedienung und fachliche Grundlagen.",
};

export default function DokuUebersicht() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_1fr] lg:py-12">
      <DokuNavigation />
      <main className="flex min-w-0 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dokumentation</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Wie Lagekit betrieben wird, wie es im Einsatz funktioniert und worauf die Rechnungen beruhen. Die Bedienung selbst
            erklärt die App an Ort und Stelle; diese Seiten sind auch offline verfügbar, sobald die App einmal geladen wurde.
          </p>
        </div>
        {DOKU.map((gruppe) => (
          <section key={gruppe.id} id={gruppe.id} aria-labelledby={`${gruppe.id}-titel`} className="flex scroll-mt-24 flex-col gap-4">
            <h2 id={`${gruppe.id}-titel`} className="text-2xl font-semibold tracking-tight">
              {gruppe.titel}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {gruppe.eintraege.map((d) => (
                <li key={d.pfad}>
                  <Link
                    href={dokuHref(d.pfad)}
                    className="group flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30"
                  >
                    <span className="flex items-center gap-1 font-semibold">
                      {d.name}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span className="text-muted-foreground">{d.beschreibung}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
