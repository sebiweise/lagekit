import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

const OUT_DIR = path.resolve(__dirname, "../out");

/** Startet einen eigenen statischen Server für out/ auf einem freien Port. */
export async function starteServer(): Promise<{ server: Server; baseURL: string }> {
  // Dynamischer Import, weil Playwright Testdateien als CommonJS lädt.
  const { serveOut } = await import("../scripts/serve-out.mjs");
  const server = await serveOut({ root: OUT_DIR, port: 0 });
  return { server, baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

export function stoppeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}
