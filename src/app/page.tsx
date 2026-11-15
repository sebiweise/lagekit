import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  Cloud,
  Container,
  FileArchive,
  LayoutPanelLeft,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  UserX,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { SiteFuss } from "@/components/site/site-fuss";
import { SiteKopf } from "@/components/site/site-kopf";
import { buttonVariants } from "@/components/ui/button";
import { DOCKER_IMAGE, RELEASES_URL, REPO_URL } from "@/core/projekt";
import { APP_PFAD, START_SKRIPT } from "@/core/pwa/adressen";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { dokuHref } from "@/site/doku-liste";
import { toolRegistry } from "@/tools/registry";

export const metadata: Metadata = {
  title: { absolute: "Lagekit – Offline-Toolbox für Einsatzkräfte im ELW" },
  description:
    "Einsatztagebuch, Strahlenexposition, Karte und mehr für den Einsatzleitwagen. Läuft im Browser ohne Netz, alle Daten bleiben auf dem Gerät. Kostenlos und Open Source.",
};

const GRUNDSAETZE: { icon: LucideIcon; titel: string; text: string }[] = [
  { icon: WifiOff, titel: "Läuft ohne Netz", text: "Einmal geöffnet, funktioniert alles offline, auch nach einem Neustart des Geräts." },
  { icon: ShieldCheck, titel: "Daten bleiben auf dem Gerät", text: "Einsätze liegen nur im Browser. Kein Server sieht sie, Sicherung und Export per Datei." },
  { icon: UserX, titel: "Kein Konto, kein Tracking", text: "Öffnen und loslegen. Keine Anmeldung, keine Statistik, keine Werbung." },
  { icon: RefreshCw, titel: "Updates nur nach Bestätigung", text: "Eine neue Version wartet, bis jemand sie aktiviert. Nie mitten im Einsatz." },
];

const KERN: { icon: LucideIcon; titel: string; text: string }[] = [
  { icon: Briefcase, titel: "Einsätze", text: "Anlegen, wechseln, bearbeiten und abschließen. Jede Änderung wird im Tagebuch vermerkt, Sicherung als JSON." },
  { icon: Users, titel: "Gemeinsam arbeiten", text: "Mehrere Geräte am selben Einsatz, direkt im lokalen Netz. Beitritt per QR-Code, Datei oder Kurzcode." },
  { icon: FileArchive, titel: "Export, Druck und Mail", text: "Einsatzbericht als PDF, alles als ZIP, Versand über das eigene Mailprogramm. Ordner wie Drohnenaufnahmen verknüpfen." },
  { icon: LayoutPanelLeft, titel: "Arbeitsbereich", text: "Mehrere Tools nebeneinander oder als Tabs, frei angeordnet für den großen Bildschirm im ELW." },
  { icon: Search, titel: "Suche", text: "Eine Suche über Tagebuch, Personen und Dateien, dazu geprüfte externe Dienste." },
  { icon: Bell, titel: "Benachrichtigungen", text: "Neue Tagebucheinträge anderer Geräte, neue Dateien und Updates erscheinen sofort, ganz ohne Server." },
];

const BETRIEB: { icon: LucideIcon; titel: string; text: string; href: string; extern?: boolean }[] = [
  { icon: Container, titel: "Docker", text: "Fertiges Image für amd64 und arm64, z. B. auf dem Server im Gerätehaus.", href: dokuHref("betrieb/docker") },
  { icon: Server, titel: "Eigener Webserver", text: "ZIP aus dem Release entpacken, auf nginx, Apache, Caddy oder Webspace.", href: dokuHref("betrieb/statisch") },
  { icon: Cloud, titel: "Vercel", text: "Fork importieren, fertig. Mit eigenem Kurzcode-Dienst.", href: dokuHref("betrieb/vercel") },
  { icon: Cloud, titel: "Cloudflare Pages", text: "Aus dem Repository bauen oder das ZIP hochladen.", href: dokuHref("betrieb/cloudflare-pages") },
];

const abschnitt = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/** Öffentliche Startseite. Die App liegt unter /app/, installierte Apps starten dort. */
export default function Startseite() {
  return (
    <>
      {/* Installierte Apps und Geräte, die die App schon nutzen, gehen direkt in die App. */}
      <script dangerouslySetInnerHTML={{ __html: START_SKRIPT }} />
      <SiteKopf aktiv="start" />
      <main className="flex flex-col gap-20 pb-20 sm:gap-24">
        <section className="border-b bg-gradient-to-b from-red-700/10 to-transparent dark:from-red-500/10">
          <div className={cn(abschnitt, "flex flex-col gap-6 py-14 sm:py-20 lg:max-w-4xl lg:items-center lg:text-center")}>
            <p className="text-sm font-semibold tracking-wide text-red-700 uppercase dark:text-red-400">
              Kostenlos · Open Source · offline
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Die Offline-Toolbox für den Einsatzleitwagen
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
              Lagekit hilft Einsatzkräften im Katastrophenschutz beim Erfassen, Dokumentieren und Rechnen: Einsatztagebuch,
              Strahlenexposition, Karte und mehr. Im Browser, ohne Installation, ohne Netz.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={APP_PFAD} className={buttonVariants({ size: "lg" })}>
                App öffnen <ArrowRight aria-hidden />
              </Link>
              <Link href="/docs/" className={buttonVariants({ size: "lg", variant: "outline" })}>
                <BookOpen aria-hidden /> Dokumentation
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Am PC, Tablet und Handy. Lässt sich als App installieren und startet dann direkt.
            </p>
          </div>
          <div className={cn(abschnitt, "pb-14 sm:pb-20")}>
            <figure className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-red-950/10 dark:shadow-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export ohne Bildoptimierung */}
              <img
                src="/bilder/app-tagebuch-hell.png"
                alt="Lagekit am PC: Einsatztagebuch mit Schnellerfassung und Einträgen zum Einsatz „Gefahrstoffaustritt“"
                width={1440}
                height={860}
                className="block h-auto w-full dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export ohne Bildoptimierung */}
              <img
                src="/bilder/app-tagebuch-dunkel.png"
                alt="Lagekit am PC im dunklen Farbschema: Einsatztagebuch"
                width={1440}
                height={860}
                className="hidden h-auto w-full dark:block"
                loading="lazy"
              />
            </figure>
          </div>
        </section>

        <section aria-labelledby="grundsaetze" className={abschnitt}>
          <h2 id="grundsaetze" className="sr-only">
            Grundsätze
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GRUNDSAETZE.map(({ icon: Icon, titel, text }) => (
              <li key={titel} className="flex flex-col gap-2">
                <Icon className="size-7 text-red-700 dark:text-red-400" aria-hidden />
                <h3 className="text-lg font-semibold">{titel}</h3>
                <p className="text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="funktionen" aria-labelledby="funktionen-titel" className={cn(abschnitt, "flex scroll-mt-20 flex-col gap-8")}>
          <div className="flex flex-col gap-2">
            <h2 id="funktionen-titel" className="text-3xl font-bold tracking-tight">
              Tools für den Einsatz
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Jedes Tool arbeitet mit dem aktiven Einsatz und lässt sich drucken oder exportieren.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolRegistry.map(({ id, icon: Icon, name, beschreibung }) => (
              <li key={id} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                <span className="flex size-11 items-center justify-center rounded-lg bg-red-700/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="text-muted-foreground">{beschreibung}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-2xl font-bold tracking-tight">Rund um den Einsatz</h3>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {KERN.map(({ icon: Icon, titel, text }) => (
              <li key={titel} className="flex gap-4">
                <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex flex-col gap-1">
                  <h4 className="font-semibold">{titel}</h4>
                  <p className="text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="betrieb" aria-labelledby="betrieb-titel" className={cn(abschnitt, "flex scroll-mt-20 flex-col gap-8")}>
          <div className="flex flex-col gap-2">
            <h2 id="betrieb-titel" className="text-3xl font-bold tracking-tight">
              Nutzen oder selbst betreiben
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Lagekit besteht nur aus statischen Dateien. Die gehostete Fassung ist sofort nutzbar; wer die eigene Installation
              bevorzugt, betreibt sie auf jedem Webserver mit HTTPS.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
              <h3 className="text-xl font-semibold">In einer Minute mit Docker</h3>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{`docker run -d -p 8080:8080 --restart unless-stopped \\\n  ${DOCKER_IMAGE}:latest`}</code>
              </pre>
              <p className="text-muted-foreground">
                Danach läuft Lagekit unter <code className="rounded bg-muted px-1.5 py-0.5 text-sm">http://localhost:8080</code>. Für
                andere Geräte gehört ein Reverse-Proxy mit HTTPS davor.
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                <Link href={dokuHref("betrieb/selbst-betreiben")} className={buttonVariants({ variant: "outline" })}>
                  Anleitung zum Betrieb
                </Link>
                <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost" })}>
                  Releases auf GitHub
                </a>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {BETRIEB.map(({ icon: Icon, titel, text, href }) => (
                <li key={titel}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30"
                  >
                    <Icon className="size-6 text-muted-foreground" aria-hidden />
                    <span className="flex items-center gap-1 font-semibold">
                      {titel}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span className="text-muted-foreground">{text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="mitmachen-titel" className={abschnitt}>
          <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <h2 id="mitmachen-titel" className="text-2xl font-bold tracking-tight">
                Offen entwickelt, mit Einsatzkräften
              </h2>
              <p className="text-muted-foreground">
                Lagekit ist freie Software unter der AGPL-3.0. Fehler, Wünsche und fachliche Hinweise nehmen wir auf GitHub an.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                Quellcode ansehen
              </a>
              <Link href="/app/hinweise/#hilfe" className={buttonVariants({ variant: "outline" })}>
                Hilfe und Feedback
              </Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">{t.hinweise.haftungTitel}:</strong> {t.hinweise.haftung}
          </p>
        </section>
      </main>
      <SiteFuss />
    </>
  );
}
