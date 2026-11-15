import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Seitenleiste } from "@/components/layout/seitenleiste";
import { UntereLeiste } from "@/components/layout/untere-leiste";
import { SitzungHinweis } from "@/core/sync/components/sitzung-hinweis";
import { t } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.beschreibung,
  applicationName: t.app.name,
  // Statische Datei in public/: App-Routen für Metadaten passen nicht zu Static Export mit Cache Components.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  colorScheme: "light dark",
  // Inhalt bis unter Statusleiste und Home-Indikator; Abstände über env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      {/* Unten Platz für die feste Navigationsleiste auf Handy und Tablet. */}
      <body className="flex min-h-full touch-manipulation flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 print:pb-0">
        <AppHeader />
        <div className="flex flex-1">
          <Seitenleiste />
          <div className="flex min-w-0 flex-1 flex-col">
            <SitzungHinweis />
            {children}
          </div>
        </div>
        <UntereLeiste />
      </body>
    </html>
  );
}
