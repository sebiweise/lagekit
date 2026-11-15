import type { Metadata, Viewport } from "next";
import { FARBSCHEMA_SKRIPT } from "@/core/darstellung/farbschema";
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

/**
 * Gemeinsamer Rahmen für Startseite (`/`), Dokumentation (`/docs/`) und App (`/app/`).
 * Kopfzeile, Navigation und Hinweise der App stehen in `app/app/layout.tsx`.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: Das Farbschema-Skript setzt die Klasse light/dark vor React.
    <html lang="de" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FARBSCHEMA_SKRIPT }} />
      </head>
      <body className="flex min-h-full touch-manipulation flex-col">{children}</body>
    </html>
  );
}
