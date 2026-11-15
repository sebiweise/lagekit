"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FolderOpen, NotebookPen, RefreshCw, Users, type LucideIcon } from "lucide-react";
import { toast, Toaster } from "@/components/ui/toast";
import { getDb } from "@/core/db/db";
import { sitzungBeobachten, tagebuchBeobachten, updateBeobachten } from "../quellen";
import { anzeigeSetzen, type BenachrichtigungArt } from "../verlauf";

export const ART_ICON: Record<BenachrichtigungArt, LucideIcon> = {
  tagebuch: NotebookPen,
  dateien: FolderOpen,
  update: RefreshCw,
  sitzung: Users,
};

/** Normale Meldungen bleiben 6 s stehen, wichtige bis zum Schließen. */
const DAUER_MS = 6000;

/**
 * Einmal im Layout: verbindet den Verlauf mit den Einblendungen und startet die
 * Beobachter für Tagebuch, Gemeinsam-Sitzung und Updates. Neue Dateien meldet
 * die Ordner-Überwachung selbst.
 */
export function Benachrichtigungen() {
  const pfad = usePathname();

  useEffect(() => {
    anzeigeSetzen((b, wichtig) => {
      toast.add({
        id: b.id,
        title: b.titel,
        description: b.text,
        type: wichtig ? "wichtig" : b.art,
        priority: wichtig ? "high" : "low",
        timeout: wichtig ? 0 : DAUER_MS,
        data: { icon: ART_ICON[b.art], href: b.href, linkText: b.linkText },
      });
    });
    const stopp = [tagebuchBeobachten(getDb()), sitzungBeobachten(), updateBeobachten()];
    return () => {
      anzeigeSetzen(null);
      for (const s of stopp) s();
    };
  }, []);

  return <Toaster pfad={pfad} />;
}
