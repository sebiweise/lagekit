import Link from "next/link";
import { cn } from "@/lib/utils";
import { DOKU, dokuHref } from "@/site/doku-liste";

/** Seitenleiste der Dokumentation; am Handy aufklappbar über dem Text. */
export function DokuNavigation({ aktiv }: { aktiv?: string }) {
  const liste = (
    <nav aria-label="Dokumentation" className="flex flex-col gap-6">
      <Link
        href="/docs/"
        className={cn("font-semibold hover:underline", !aktiv && "text-red-700 dark:text-red-400")}
        aria-current={!aktiv ? "page" : undefined}
      >
        Übersicht
      </Link>
      {DOKU.map((gruppe) => (
        <div key={gruppe.id} className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{gruppe.titel}</p>
          <ul className="flex flex-col">
            {gruppe.eintraege.map((d) => (
              <li key={d.pfad}>
                <Link
                  href={dokuHref(d.pfad)}
                  aria-current={aktiv === d.pfad ? "page" : undefined}
                  className={cn(
                    "-ml-3 block rounded-md border-l-2 border-transparent py-1.5 pl-3 text-muted-foreground hover:text-foreground",
                    aktiv === d.pfad && "border-red-700 font-medium text-foreground dark:border-red-400",
                  )}
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <details className="rounded-lg border bg-card lg:hidden">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium">Inhalt der Dokumentation</summary>
        <div className="border-t px-4 py-4 pl-7">{liste}</div>
      </details>
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-4 pl-3">{liste}</div>
      </aside>
    </>
  );
}
