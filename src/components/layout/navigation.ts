import type { LucideIcon } from "lucide-react";
import { Briefcase, Home, Info, Search, Users } from "lucide-react";
import { t } from "@/i18n";
import { toolHref, toolRegistry } from "@/tools/registry";

/**
 * Alle Ziele der Navigation an einer Stelle. Handy und Tablet zeigen die
 * Ziele mit `unten` in der Leiste am unteren Rand, alles andere unter „Mehr“.
 * Am PC (ab `lg`) stehen die Ziele mit `oben` in der Kopfzeile, der Rest unter „Mehr“.
 */
export interface NavZiel {
  href: string;
  text: string;
  /** Kurzer Text für die Leiste unten (wenig Platz). */
  kurz?: string;
  icon: LucideIcon;
  unten?: boolean;
  oben?: boolean;
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
    oben: true,
    beschreibung: tool.beschreibung,
  }));
  const unten = Object.keys(TOOLS_UNTEN)
    .map((id) => tools.find((z) => z.href === `/tools/${id}/`))
    .filter((z): z is NavZiel => Boolean(z));
  const sonstige = tools.filter((z) => !z.unten);

  return [
    { href: "/", text: t.nav.start, icon: Home, unten: true, oben: true },
    ...unten,
    { href: "/suche/", text: t.nav.suche, icon: Search, unten: true, oben: true },
    {
      href: "/einsatz/",
      text: t.nav.einsatz,
      icon: Briefcase,
      oben: true,
      beschreibung: "Einsatz anlegen, wechseln, abschließen, sichern",
    },
    ...sonstige,
    {
      href: "/sitzung/",
      text: t.nav.sitzung,
      icon: Users,
      oben: true,
      beta: true,
      beschreibung: "Mehrere Geräte am selben Einsatz",
    },
    { href: "/hinweise/", text: "Hinweise", icon: Info, beschreibung: t.hinweise.link },
  ];
}

/** Aktiv ist ein Ziel bei gleichem Pfad oder einer Unterseite (z. B. Druckansicht). */
export function istAktiv(pfad: string, href: string): boolean {
  if (href === "/") return pfad === "/";
  return pfad === href || pfad.startsWith(href);
}
