import type { Server } from "node:http";

export function serveOut(options?: { root?: string; port?: number; host?: string }): Promise<Server>;
