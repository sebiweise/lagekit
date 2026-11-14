// Baut den Service Worker nach `next build`:
// 1. bündelt src/core/pwa/sw.ts mit esbuild,
// 2. trägt alle Dateien aus out/ als Precache-Liste ein (Serwist injectManifest).
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectManifest } from "@serwist/build";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out");
const tmpSw = path.join(root, ".sw-build", "sw.js");

await build({
  entryPoints: [path.join(root, "src/core/pwa/sw.ts")],
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  outfile: tmpSw,
  logLevel: "warning",
});

const { count, size, warnings } = await injectManifest({
  swSrc: tmpSw,
  swDest: path.join(outDir, "sw.js"),
  globDirectory: outDir,
  globPatterns: ["**/*.{html,txt,js,css,json,webmanifest,ico,png,svg,woff2}"],
  globIgnores: ["sw.js", "404/**", "_not-found/**"],
  // Dateien in _next/static tragen einen Hash im Namen und brauchen keine Revision.
  dontCacheBustURLsMatching: /^_next\/static\//,
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
});

await rm(path.dirname(tmpSw), { recursive: true, force: true });

for (const warning of warnings) console.warn(`[sw] ${warning}`);
console.log(`[sw] ${count} Dateien (${(size / 1024).toFixed(0)} KiB) im Precache`);
