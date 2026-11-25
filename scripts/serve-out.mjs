// Minimaler statischer Server für den Export in out/ (lokaler Test, Playwright).
// Für den Betrieb im ELW genügt jeder Webserver mit HTTPS; siehe README.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function resolveFile(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = path.normalize(path.join(root, decoded));
  if (!target.startsWith(root)) return null;
  for (const candidate of [target, path.join(target, "index.html"), `${target}.html`]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // nächster Kandidat
    }
  }
  return null;
}

/**
 * Startet den Server; Port 0 wählt einen freien Port. `basis` (z. B. `/lagekit`)
 * liefert out/ wie GitHub Pages in diesem Unterordner aus, alles andere ist 404.
 */
export function serveOut({ root, port = 3000, host = "127.0.0.1", basis = "" } = {}) {
  const base = path.resolve(root ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../out"));
  const server = createServer(async (req, res) => {
    let url = req.url ?? "/";
    if (basis) {
      if (url === basis || url.startsWith(`${basis}?`)) {
        res.writeHead(301, { Location: `${basis}/${url.slice(basis.length)}` });
        res.end();
        return;
      }
      // Außerhalb des Unterordners: auf Pages die 404-Seite eines anderen Projekts.
      url = url.startsWith(`${basis}/`) ? url.slice(basis.length) : "/404-ausserhalb-der-basis/";
    }
    const file = await resolveFile(base, url);
    const status = file ? 200 : 404;
    const body = file ?? path.join(base, "404.html");
    res.writeHead(status, {
      "Content-Type": TYPES[path.extname(body)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(body).on("error", () => res.end()).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  const { basisPfadAus } = await import("../src/core/pwa/adressen.ts");
  const basis = basisPfadAus(process.env.BASE_PATH);
  const server = await serveOut({ port, basis });
  const address = server.address();
  console.log(`Lagekit läuft auf http://${address.address}:${address.port}${basis}/`);
}
