import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CodeXml } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { REPO_URL } from "@/core/projekt";
import { APP_PFAD, mitBasis } from "@/core/pwa/adressen";
import { cn } from "@/lib/utils";

/** Kopfzeile von Startseite und Dokumentation (nicht der App). */
export function SiteKopf({ aktiv }: { aktiv?: "start" | "docs" }) {
  const link = "rounded-md px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2.5 text-xl font-bold" aria-label="Lagekit, zur Startseite">
          {/* next/image setzt den Basispfad nicht selbst davor. */}
          <Image src={mitBasis("/icons/icon-192.png")} alt="" width={32} height={32} className="size-8 rounded-md" />
          Lagekit
        </Link>
        <nav aria-label="Website" className="flex items-center gap-1">
          <Link href="/#funktionen" className={cn(link, "hidden md:inline-flex")}>
            Funktionen
          </Link>
          <Link href="/#betrieb" className={cn(link, "hidden md:inline-flex")}>
            Selbst betreiben
          </Link>
          <Link href="/docs/" className={cn(link, aktiv === "docs" && "text-foreground")} aria-current={aktiv === "docs" ? "page" : undefined}>
            Doku
          </Link>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={cn(link, "hidden sm:inline-flex items-center gap-1.5")}>
            <CodeXml className="size-5" aria-hidden /> GitHub
          </a>
          <Link href={APP_PFAD} className={cn(buttonVariants({ size: "sm" }), "ml-1")}>
            App öffnen <ArrowRight aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
