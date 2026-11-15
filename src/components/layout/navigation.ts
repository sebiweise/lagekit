import type { LucideIcon } from "lucide-react";
import { Briefcase, FileArchive, History, Home, Info, LayoutPanelLeft, Search, Users } from "lucide-react";
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
    .map((id) => tools.find((z) => z.href === `/tools/${id}/`))
    .filter((z): z is NavZiel => Boolean(z));
  const sonstige = tools.filter((z) => !z.unten);

  return [
    { href: "/", text: t.nav.start, icon: Home, unten: true },
    ...unten,
    { href: "/suche/", text: t.nav.suche, icon: Search, unten: true },
    {
      href: "/einsatz/",
      text: t.nav.einsatz,
      icon: Briefcase,
      beschreibung: "Einsatz anlegen, wechseln, abschließen, sichern",
    },
    {
      href: "/export/",
      text: "Export, Druck, Mail",
      icon: FileArchive,
      beschreibung: "Alles zum Einsatz als ZIP, Bericht drucken, per Mail senden, Ordner verknüpfen",
    },
    ...sonstige,
    {
      href: "/arbeitsbereich/",
      text: t.nav.arbeitsbereich,
      icon: LayoutPanelLeft,
      beschreibung: "Mehrere Tools nebeneinander oder als Tabs",
    },
    {
      href: "/sitzung/",
      text: t.nav.sitzung,
      icon: Users,
      beta: true,
      beschreibung: "Mehrere Geräte am selben Einsatz",
    },
    {
      href: "/aenderungen/",
      text: t.aenderungen.titel,
      icon: History,
      beschreibung: "Was ist neu, Updates und Datenumstellungen",
    },
    { href: "/hinweise/", text: "Hinweise", icon: Info, beschreibung: t.hinweise.link },
  ];
}

/** Aktiv ist ein Ziel bei gleichem Pfad oder einer Unterseite (z. B. Druckansicht). */
export function istAktiv(pfad: string, href: string): boolean {
  if (href === "/") return pfad === "/";
  return pfad === href || pfad.startsWith(href);
}
