import Link from "next/link";
import { FarbschemaUmschalter } from "@/core/darstellung/components/farbschema-umschalter";
import { DOCKER_URL, HILFE_URL, LIZENZ_URL, RELEASES_URL, REPO_URL } from "@/core/projekt";
import { APP_PFAD } from "@/core/pwa/adressen";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

const extern = { target: "_blank", rel: "noopener noreferrer" } as const;
const link = "inline-flex min-h-11 items-center self-start rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Fußzeile von Startseite und Dokumentation. */
export function SiteFuss() {
  return (
    <footer className="mt-auto border-t bg-muted/40 pb-[env(safe-area-inset-bottom)] print:hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 text-muted-foreground sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-foreground">Lagekit</p>
          <p>Offline-Toolbox für Einsatzkräfte im Einsatzleitwagen. Open Source unter der AGPL-3.0.</p>
          {VERSION && <p className="font-mono text-xs tabular-nums">Version {VERSION}</p>}
        </div>
        <nav aria-label="App und Hilfe" className="flex flex-col">
          <p className="font-medium text-foreground">App</p>
          <Link href={APP_PFAD} className={link}>App öffnen</Link>
          <Link href="/docs/" className={link}>Dokumentation</Link>
          <Link href="/app/aenderungen/" className={link}>Änderungen</Link>
          <Link href="/app/hinweise/" className={link}>Hinweise, Haftung und Datenschutz</Link>
        </nav>
        <nav aria-label="Projekt" className="flex flex-col">
          <p className="font-medium text-foreground">Projekt</p>
          <a href={REPO_URL} className={link} {...extern}>Quellcode auf GitHub</a>
          <a href={RELEASES_URL} className={link} {...extern}>Releases und ZIP</a>
          <a href={DOCKER_URL} className={link} {...extern}>Docker-Image</a>
          <a href={HILFE_URL} className={link} {...extern}>Fehler melden, Wunsch äußern</a>
          <a href={LIZENZ_URL} className={link} {...extern}>Lizenz (AGPL-3.0)</a>
        </nav>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">Darstellung</p>
          <FarbschemaUmschalter className="self-start" />
        </div>
      </div>
    </footer>
  );
}
