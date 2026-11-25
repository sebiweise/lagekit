/**
 * Dokumentation unter `/docs/`: die Markdown-Dateien aus `docs/` werden beim
 * Build gelesen und als statische Seiten ausgegeben (nur im Server-Teil, ohne
 * JavaScript im Browser). Die Dateien bleiben auch auf GitHub lesbar.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";
import { REPO_URL } from "@/core/projekt";
import { mitBasis } from "@/core/pwa/adressen";
import { ALLE_DOKUS, DOKU, dokuHref, type DokuEintrag } from "./doku-liste";

export { ALLE_DOKUS, DOKU, dokuHref, type DokuEintrag };

export interface Ueberschrift {
  id: string;
  text: string;
}

export interface DokuSeite {
  eintrag: DokuEintrag;
  titel: string;
  html: string;
  /** Abschnitte (Ebene 2) für das Inhaltsverzeichnis. */
  abschnitte: Ueberschrift[];
  /** Datei im Repository, z. B. für „Auf GitHub bearbeiten“. */
  quelle: string;
}

const WURZEL = process.cwd();

/** Anker wie auf GitHub: klein, Leerzeichen zu Bindestrich, Satzzeichen weg (Umlaute bleiben). */
export function anker(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

const textOhneHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/**
 * Relative Links aus dem Markdown: auf andere Seiten der Dokumentation unter `/docs/`,
 * alles andere im Repository auf GitHub.
 */
export function linkZiel(href: string, datei: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
  const [ziel, hash] = href.split("#", 2);
  const repoPfad = path.posix.normalize(path.posix.join(path.posix.dirname(datei), ziel));
  const anhang = hash ? `#${hash}` : "";
  const doku = ALLE_DOKUS.find((d) => `docs/${d.pfad}.md` === repoPfad);
  if (doku) return dokuHref(doku.pfad) + anhang;
  const gruppe = DOKU.find((g) => g.eintraege.some((d) => `docs/${d.pfad}`.startsWith(repoPfad.replace(/\/$/, "") + "/")));
  if (gruppe && ziel.endsWith("/")) return `/docs/#${gruppe.id}`;
  const art = ziel.endsWith("/") || !path.posix.extname(repoPfad) ? "tree" : "blob";
  return `${REPO_URL}/${art}/master/${repoPfad}${anhang}`;
}

export function dokuLaden(pfad: string): DokuSeite {
  const eintrag = ALLE_DOKUS.find((d) => d.pfad === pfad);
  if (!eintrag) throw new Error(`Unbekannte Dokumentation: ${pfad}`);
  const quelle = `docs/${pfad}.md`;
  const markdown = readFileSync(path.join(WURZEL, quelle), "utf8");

  let titel = eintrag.name;
  const abschnitte: Ueberschrift[] = [];
  const vergeben = new Map<string, number>();

  const marked = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type === "link") token.href = linkZiel(token.href, quelle);
    },
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const inhalt = this.parser.parseInline(tokens);
        if (depth === 1) {
          titel = textOhneHtml(inhalt);
          return "";
        }
        let id = anker(textOhneHtml(inhalt));
        const n = vergeben.get(id) ?? 0;
        vergeben.set(id, n + 1);
        if (n > 0) id = `${id}-${n}`;
        if (depth === 2) abschnitte.push({ id, text: textOhneHtml(inhalt) });
        return `<h${depth} id="${id}"><a href="#${id}" class="doku-anker">${inhalt}</a></h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const extern = /^https?:/.test(href);
        const t = title ? ` title="${title}"` : "";
        return extern
          ? `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`
          : // Reines HTML ohne next/link: Basispfad selbst davor (`/docs/…`).
            `<a href="${mitBasis(href)}"${t}>${text}</a>`;
      },
    },
  });

  const html = (marked.parse(markdown, { async: false }) as string)
    // Breite Tabellen scrollen am Handy für sich, nicht die ganze Seite.
    .replace(/<table>/g, '<div class="doku-tabelle"><table>')
    .replace(/<\/table>/g, "</table></div>");

  return { eintrag, titel, html, abschnitte, quelle };
}
