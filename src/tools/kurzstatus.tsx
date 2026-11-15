import type { ComponentType } from "react";
import { TagebuchKurzstatus } from "./einsatztagebuch/components/kurzstatus";
import { StrahlenKurzstatus } from "./strahlenexposition/components/kurzstatus";

/**
 * Optionaler Live-Status je Tool für die Kacheln der Lage-Seite (Tool-ID → Komponente).
 * Getrennt von den Manifesten, damit Datenbank und Export keine Oberfläche laden.
 */
export const kurzstatus: Record<string, ComponentType<{ einsatzId: string }>> = {
  einsatztagebuch: TagebuchKurzstatus,
  strahlenexposition: StrahlenKurzstatus,
};
