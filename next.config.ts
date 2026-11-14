import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import packageJson from "./package.json" with { type: "json" };

function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unbekannt";
  }
}

const nextConfig: NextConfig = {
  // Reine statische Dateien in `out/`: kein Server, überall hostbar.
  output: "export",
  // `/hinweise/` → `/hinweise/index.html`, funktioniert auf jedem Static-Host
  // und passt zur Precache-Auflösung des Service Workers.
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_APP_COMMIT: gitCommit(),
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
