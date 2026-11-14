import type { Metadata, Viewport } from "next";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
