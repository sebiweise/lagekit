import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { serveOut } from "../scripts/serve-out.mjs";
import { basisPfadAus } from "../src/core/pwa/adressen";

const OUT_DIR = path.resolve(import.meta.dirname, "../out");

/** Wie beim Build: Mit BASE_PATH=/lagekit laufen die Tests unter `/lagekit/` (GitHub Pages). */
const BASIS = basisPfadAus(process.env.BASE_PATH);

/** Startet einen eigenen statischen Server für out/ (oder eine Kopie) auf einem freien Port. */
export async function starteServer(root = OUT_DIR): Promise<{ server: Server; baseURL: string }> {
  const server = await serveOut({ root, port: 0, basis: BASIS });
  return { server, baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}${BASIS}` };
}

export function stoppeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}
