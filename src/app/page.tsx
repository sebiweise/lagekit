import Link from "next/link";
import { FarbschemaUmschalter } from "@/core/darstellung/components/farbschema-umschalter";
import { AktiverEinsatzKarte } from "@/core/einsatz/components/aktiver-einsatz-karte";
import { ToolKacheln } from "@/core/einsatz/components/tool-kacheln";
import { PwaStatus } from "@/core/pwa/components/pwa-status";
import { t } from "@/i18n";

/** Lage-Seite: aktiver Einsatz, Stand jedes Tools auf einen Blick, Gerätestatus. */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="sr-only">{t.app.name}</h1>

      <AktiverEinsatzKarte />

      <section aria-labelledby="tools-titel" className="flex flex-col gap-3">
        <h2 id="tools-titel" className="text-xl font-semibold">
          {t.start.toolsTitel}
        </h2>
        <ToolKacheln />
      </section>

      <PwaStatus />

      <footer className="mt-auto flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground">
        <p>{t.start.untertitel}</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/hinweise/" className="underline underline-offset-4 hover:text-foreground">
            {t.hinweise.link}
          </Link>
          <FarbschemaUmschalter />
        </div>
      </footer>
    </main>
  );
}
