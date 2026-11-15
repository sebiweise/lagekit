import { SiteFuss } from "@/components/site/site-fuss";
import { SiteKopf } from "@/components/site/site-kopf";

/** Dokumentation unter `/docs/`: Kopf- und Fußzeile der Website, nicht der App. */
export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <>
      <SiteKopf aktiv="docs" />
      {children}
      <SiteFuss />
    </>
  );
}
