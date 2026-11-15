import type { LucideIcon } from "lucide-react";
import { BookOpen, Briefcase, CodeXml, FileArchive, Globe2, History, Home, Info, LayoutPanelLeft, LifeBuoy, Search, Users } from "lucide-react";
import { HILFE_URL, REPO_URL } from "@/core/projekt";
import { t } from "@/i18n";
import { toolHref, toolRegistry } from "@/tools/registry";

/**
 * Alle Ziele der Navigation an einer Stelle. Am PC (ab `lg`) stehen alle in der
 * Seitenleiste links. Handy und Tablet zeigen die Ziele mit `unten` in der Leiste
 * am unteren Rand, alles andere unter „Mehr“.
 */
export interface NavZiel {
  href: string;
  text: string;
  /** Kurzer Text für die Leiste unten (wenig Platz). */
  kurz?: string;
  icon: LucideIcon;
  unten?: boolean;
  beta?: boolean;
  beschreibung?: string;
}

/** Tools, die in der Leiste unten liegen, mit Kurznamen. Reihenfolge = Reihenfolge der Leiste. */
const TOOLS_UNTEN: Record<string, string> = {
  einsatztagebuch: "Tagebuch",
  strahlenexposition: "Strahlen",
};

export function navigationsZiele(): NavZiel[] {
  const tools: NavZiel[] = toolRegistry.map((tool) => ({
    href: toolHref(tool),
    text: tool.name,
    kurz: TOOLS_UNTEN[tool.id],
    icon: tool.icon,
    unten: tool.id in TOOLS_UNTEN,
    beschreibung: tool.beschreibung,
  }));
  const unten = Object.keys(TOOLS_UNTEN)
    .map((id) => tools.find((z) => z.href === `/app/tools/${id}/`))
    .filter((z): z is NavZiel => Boolean(z));
  const sonstige = tools.filter((z) => !z.unten);

  return [
    { href: "/app/", text: t.nav.start, icon: Home, unten: true },
    ...unten,
    { href: "/app/suche/", text: t.nav.suche, icon: Search, unten: true },
    {
      href: "/app/einsatz/",
      text: t.nav.einsatz,
      icon: Briefcase,
      beschreibung: "Einsatz anlegen, wechseln, abschließen, sichern",
    },
    {
      href: "/app/export/",
      text: "Export, Druck, Mail",
      icon: FileArchive,
      beschreibung: "Alles zum Einsatz als ZIP, Bericht drucken, per Mail senden, Ordner verknüpfen",
    },
    ...sonstige,
    {
      href: "/app/arbeitsbereich/",
      text: t.nav.arbeitsbereich,
      icon: LayoutPanelLeft,
      beschreibung: "Mehrere Tools nebeneinander oder als Tabs",
    },
    {
      href: "/app/sitzung/",
      text: t.nav.sitzung,
      icon: Users,
      beta: true,
      beschreibung: "Mehrere Geräte am selben Einsatz",
    },
    {
      href: "/app/aenderungen/",
      text: t.aenderungen.titel,
      icon: History,
      beschreibung: "Was ist neu, Updates und Datenumstellungen",
    },
    { href: "/app/hinweise/", text: "Hinweise", icon: Info, beschreibung: t.hinweise.link },
  ];
}

/**
 * Website rund um die App: Dokumentation und Startseite. Gleiche Domain und nach dem
 * ersten Laden auch offline verfügbar, öffnen deshalb im selben Tab.
 * `?ueber`: Die Startseite zeigt sich sonst nicht, wenn die App schon genutzt wird.
 */
export const websiteLinks: NavZiel[] = [
  { href: "/docs/", text: "Dokumentation", icon: BookOpen, beschreibung: "Betrieb, Bedienung und fachliche Grundlagen" },
  { href: "/?ueber", text: "Über Lagekit", icon: Globe2, beschreibung: "Startseite mit Überblick und Links" },
];

/** Links nach außen (GitHub), öffnen in einem neuen Tab. Brauchen Internet. */
export const externeLinks: NavZiel[] = [
  {
    href: HILFE_URL,
    text: "Hilfe und Feedback",
    icon: LifeBuoy,
    beschreibung: "Fehler melden oder Verbesserung vorschlagen (GitHub)",
  },
  {
    href: REPO_URL,
    text: "Quellcode",
    icon: CodeXml,
    beschreibung: "Öffentliches Projekt auf GitHub",
  },
];

/** Aktiv ist ein Ziel bei gleichem Pfad oder einer Unterseite (z. B. Druckansicht). */
export function istAktiv(pfad: string, href: string): boolean {
  if (href === "/app/") return pfad === "/app/" || pfad === "/app";
  return pfad === href || pfad.startsWith(href);
}
