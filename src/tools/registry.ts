import type { ToolManifest } from "./types";

/**
 * Liste aller Tool-Module. Neue Tools werden hier mit ihrem
 * `manifest.ts` eingetragen; bestehende Tools bleiben unberührt.
 */
export const toolRegistry: ToolManifest[] = [];

export function toolHref(tool: ToolManifest): string {
  return `/tools/${tool.id}/`;
}

/** Alle einsatzbezogenen Tool-Tabellen mit Schema, über alle Tools. */
export function toolTabellen(tools: ToolManifest[] = toolRegistry) {
  return tools.flatMap((tool) =>
    Object.entries(tool.tabellen).map(([name, schema]) => ({ tool: tool.id, name, schema })),
  );
}
