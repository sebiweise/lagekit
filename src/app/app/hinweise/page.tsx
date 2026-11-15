import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { HILFE_URL, REPO_URL } from "@/core/projekt";
import { t } from "@/i18n";
import { DienstAnzeige } from "./dienst-anzeige";

export const metadata: Metadata = { title: t.hinweise.titel };

const abschnitte = [
  [t.hinweise.haftungTitel, t.hinweise.haftung],
  [t.hinweise.datenTitel, t.hinweise.daten],
  [t.hinweise.datenverlustTitel, t.hinweise.datenverlust],
  [t.hinweise.lizenzTitel, t.hinweise.lizenz],
] as const;

const linkKlasse = "inline-flex min-h-11 items-center gap-2 text-lg underline underline-offset-4";

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
      <section id="kurzcode" className="flex scroll-mt-20 flex-col gap-2">
        <h2 className="text-xl font-semibold">{t.hinweise.kurzcodeTitel}</h2>
        <p className="text-lg leading-relaxed">{t.hinweise.kurzcode}</p>
        <DienstAnzeige />
      </section>
      <section id="hilfe" className="flex scroll-mt-20 flex-col gap-2">
        <h2 className="text-xl font-semibold">{t.hinweise.hilfeTitel}</h2>
        <p className="text-lg leading-relaxed">{t.hinweise.hilfe}</p>
        <ul className="flex flex-col">
          <li>
            <Link href="/docs/" className={linkKlasse}>
              Dokumentation: Betrieb, Bedienung, fachliche Grundlagen
            </Link>
          </li>
          <li>
            <a href={HILFE_URL} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
              Fehler melden oder Verbesserung vorschlagen <ExternalLink className="size-4" aria-label="öffnet in neuem Tab" />
            </a>
          </li>
          <li>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
              Quellcode auf GitHub <ExternalLink className="size-4" aria-label="öffnet in neuem Tab" />
            </a>
          </li>
        </ul>
      </section>
      <Link href="/app/" className="mt-4 underline underline-offset-4">
        {t.hinweise.zurueck}
      </Link>
    </main>
  );
}
