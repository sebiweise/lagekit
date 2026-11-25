// Baut den Service Worker nach `next build`:
// 1. bündelt src/core/pwa/sw.ts mit esbuild,
// 2. setzt den Basispfad (BASE_PATH) ins Web-App-Manifest, falls die App in einem
//    Unterordner liegt (GitHub Pages),
// 3. trägt alle Dateien aus out/ als Precache-Liste ein (Serwist injectManifest).
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectManifest } from "@serwist/build";
import { build } from "esbuild";
import { appChangelog, appCommit, appVersion, basisPfad } from "./build-info.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out");
const tmpSw = path.join(root, ".sw-build", "sw.js");
const basis = basisPfad();

await build({
  entryPoints: [path.join(root, "src/core/pwa/sw.ts")],
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  outfile: tmpSw,
  logLevel: "warning",
  // Dieselben Angaben wie in der App (next.config.ts), damit der wartende
  // Worker vor dem Update sagen kann, was er mitbringt.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basis),
    "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify(appVersion()),
    "process.env.NEXT_PUBLIC_APP_COMMIT": JSON.stringify(appCommit()),
    "process.env.NEXT_PUBLIC_APP_CHANGELOG": JSON.stringify(JSON.stringify(appChangelog())),
  },
});

// public/manifest.webmanifest gilt für die Wurzel. Vor dem Precache anpassen,
// damit die Revision im Service Worker zur ausgelieferten Datei passt.
if (basis) {
  const datei = path.join(outDir, "manifest.webmanifest");
  const manifest = JSON.parse(await readFile(datei, "utf8"));
  for (const feld of ["id", "start_url", "scope"]) manifest[feld] = basis + manifest[feld];
  for (const icon of manifest.icons) icon.src = basis + icon.src;
  await writeFile(datei, `${JSON.stringify(manifest, null, 2)}
`);
}

// Einträge sind relativ zu out/ und damit zu sw.js; der Basispfad ergibt sich von selbst.
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
