import type { NextConfig } from "next";
import { appChangelog, appCommit, appVersion, basisPfad, kurzcodeDienst, umzugAdresse } from "./scripts/build-info.mjs";

// Unterordner der Installation aus BASE_PATH (GitHub Pages: `/lagekit`), sonst leer.
const basis = basisPfad();

const nextConfig: NextConfig = {
  // Reine statische Dateien in `out/`: kein Server, überall hostbar.
  output: "export",
  // `/hinweise/` → `/hinweise/index.html`, funktioniert auf jedem Static-Host
  // und passt zur Precache-Auflösung des Service Workers.
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basis ? { basePath: basis, assetPrefix: basis } : {}),
  env: {
    // Für alles, was Next.js nicht selbst anpasst (src/core/pwa/adressen.ts).
    NEXT_PUBLIC_BASE_PATH: basis,
    NEXT_PUBLIC_APP_VERSION: appVersion(),
    NEXT_PUBLIC_APP_COMMIT: appCommit(),
    // Wird in der App als „Was ist neu“ angezeigt und mit dem Update verglichen.
    NEXT_PUBLIC_APP_CHANGELOG: JSON.stringify(appChangelog()),
    // Vermittlungsdienst für den Kurzcode; leer = aus. Siehe src/core/sync/dienst-adresse.ts.
    NEXT_PUBLIC_KURZCODE_DIENST: kurzcodeDienst(),
    // Neue Adresse nach einem Umzug der Installation; leer = kein Hinweis.
    NEXT_PUBLIC_UMZUG_URL: umzugAdresse(),
  },
  // Cache Components und Partial Prefetching setzen Partial Prerendering voraus,
  // das mit `output: "export"` nicht läuft. Für eine reine Client-App unnötig.
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
