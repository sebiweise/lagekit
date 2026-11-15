<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Oberfläche (shadcn/ui)

- Alle Bedienelemente kommen aus `src/components/ui/` (shadcn/ui, Base-UI-Variante; `components.json` mit Stil `base-vega`). In Features keine nackten `<button>`, `<dialog>`, `<details>`, `<select>`, `<table>`, `<progress>` oder Checkboxen, sondern `Button`, `Dialog`/`Sheet`, `AlertDialog` (Rückfrage vor Löschen), `Popover`, `Tooltip`/`Kbd` (Hinweise und Tastenkürzel), `Autocomplete` (Freitext mit Vorschlägen), `Collapsible`, `NativeSelect`, `Table`, `Progress`, `Checkbox`/`Switch`, `ToggleGroup`, `Breadcrumb`.
- Neue Seiten und Aktionen auch in der Befehlspalette (`src/core/befehle/components/befehlspalette.tsx`) anbieten; Seiten aus `navigationsZiele()` erscheinen dort von selbst.
- Primitive nur aus `@base-ui/react/<komponente>` (nicht Radix), damit nur eine Bibliothek im Bundle landet. Statt `asChild` gilt `render={<Button … />}`.
- Neue Komponenten über die shadcn-CLI oder den shadcn-MCP-Server (`.mcp.json`) aus der Base-UI-Registry holen und danach anpassen: große Touch-Flächen (Standardhöhe `h-12`, Icon-Knöpfe `size-12`), deutsche Beschriftungen, Farben nur über die Tokens in `src/app/globals.css` (Hell/Dunkel über `.dark`, Druck immer hell). Ist die Registry nicht erreichbar, die Komponente von Hand nach der shadcn-Vorlage anlegen.
- Nichts aus dem Netz nachladen (offline-fähig, keine Web-Fonts, keine CDN-Skripte).
- Die Base-UI-Doku liegt lokal unter `node_modules/@base-ui/react/docs/`.
- Desktop (PC im ELW) ist das Hauptziel; Handy (iPhone/Safari) immer mitprüfen.
