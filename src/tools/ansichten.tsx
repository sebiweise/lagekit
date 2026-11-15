"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { toolRegistry } from "./registry";

/**
 * Tool-Oberflächen für den Arbeitsbereich, nach Tool-ID. Getrennt vom Manifest,
 * damit Datenbank und Abgleich die Oberflächen nicht mitladen müssen.
 * Ein neues Tool trägt hier seine Hauptkomponente ein.
 */
const komponenten: Record<string, ComponentType> = {
  strahlenexposition: dynamic(() =>
    import("./strahlenexposition/components/strahlenexposition").then((m) => m.Strahlenexposition),
  ),
  einsatztagebuch: dynamic(() => import("./einsatztagebuch/components/einsatztagebuch").then((m) => m.Einsatztagebuch)),
  karte: dynamic(() => import("./karte/components/karte").then((m) => m.Karte)),
  recherche: dynamic(() => import("./recherche/components/linksammlung").then((m) => m.Linksammlung)),
  suche: dynamic(() => import("./recherche/components/suche").then((m) => m.Universalsuche)),
};

export interface Ansicht {
  id: string;
  name: string;
  icon: LucideIcon;
  Komponente: ComponentType;
}

/** Alle Ansichten, die der Arbeitsbereich öffnen kann, in Reihenfolge der Startseite. */
export const ansichten: Ansicht[] = [
  ...toolRegistry
    .filter((tool) => komponenten[tool.id])
    .map((tool) => ({ id: tool.id, name: tool.name, icon: tool.icon, Komponente: komponenten[tool.id] })),
  { id: "suche", name: "Suche", icon: Search, Komponente: komponenten.suche },
];

export function ansichtVon(id: string): Ansicht | undefined {
  return ansichten.find((a) => a.id === id);
}
