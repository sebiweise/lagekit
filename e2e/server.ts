import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { serveOut } from "../scripts/serve-out.mjs";

const OUT_DIR = path.resolve(import.meta.dirname, "../out");

/** Startet einen eigenen statischen Server für out/ auf einem freien Port. */
export async function starteServer(): Promise<{ server: Server; baseURL: string }> {
  const server = await serveOut({ root: OUT_DIR, port: 0 });
  return { server, baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

export function stoppeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}
