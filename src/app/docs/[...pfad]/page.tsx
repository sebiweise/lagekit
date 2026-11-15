import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DokuNavigation } from "@/components/site/doku-navigation";
import { REPO_URL } from "@/core/projekt";
import { ALLE_DOKUS, dokuHref, dokuLaden } from "@/site/doku";

/** Nur die eingetragenen Seiten; andere Adressen unter /docs/ ergeben 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ALLE_DOKUS.map((d) => ({ pfad: d.pfad.split("/") }));
}

async function seiteLaden(params: PageProps<"/docs/[...pfad]">["params"]) {
  const { pfad } = await params;
  const name = pfad.join("/");
  if (!ALLE_DOKUS.some((d) => d.pfad === name)) notFound();
  return dokuLaden(name);
}

export async function generateMetadata({ params }: PageProps<"/docs/[...pfad]">): Promise<Metadata> {
  const seite = await seiteLaden(params);
  return { title: seite.titel, description: seite.eintrag.beschreibung };
}

export default async function DokuSeite({ params }: PageProps<"/docs/[...pfad]">) {
  const seite = await seiteLaden(params);
  const index = ALLE_DOKUS.indexOf(seite.eintrag);
  const zurueck = ALLE_DOKUS[index - 1];
  const weiter = ALLE_DOKUS[index + 1];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_1fr] lg:py-12 xl:grid-cols-[15rem_1fr_13rem]">
      <DokuNavigation aktiv={seite.eintrag.pfad} />
      <main className="flex min-w-0 flex-col gap-8">
        <article className="doku">
          <h1>{seite.titel}</h1>
          <div dangerouslySetInnerHTML={{ __html: seite.html }} />
        </article>
        <nav aria-label="Weiterlesen" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
          {zurueck ? (
            <Link href={dokuHref(zurueck.pfad)} className="flex flex-col rounded-lg border p-4 hover:border-foreground/30">
              <span className="text-sm text-muted-foreground">Zurück</span>
              <span className="font-medium">{zurueck.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {weiter && (
            <Link href={dokuHref(weiter.pfad)} className="flex flex-col rounded-lg border p-4 text-right hover:border-foreground/30">
              <span className="text-sm text-muted-foreground">Weiter</span>
              <span className="font-medium">{weiter.name}</span>
            </Link>
          )}
        </nav>
        <a
          href={`${REPO_URL}/blob/master/${seite.quelle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Diese Seite auf GitHub ansehen oder verbessern
        </a>
      </main>
      {seite.abschnitte.length > 1 && (
        <aside className="hidden xl:block">
          <nav aria-label="Auf dieser Seite" className="sticky top-24 flex flex-col gap-2 text-sm">
            <p className="font-semibold">Auf dieser Seite</p>
            {seite.abschnitte.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="text-muted-foreground hover:text-foreground">
                {a.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
