// Versionsangaben für App und Service Worker; genutzt von next.config.ts und build-sw.mjs.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changelogLesen } from "../src/core/aenderungen/changelog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function appVersion() {
  return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
}

/** Kurzer Commit-Hash; im Docker-Build ohne .git über LAGEKIT_COMMIT gesetzt. */
export function appCommit() {
  if (process.env.LAGEKIT_COMMIT) return process.env.LAGEKIT_COMMIT.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unbekannt";
  }
}

/** CHANGELOG.md als Abschnitte; wirft bei ungültigem Format, damit der Build scheitert. */
export function appChangelog() {
  return changelogLesen(readFileSync(path.join(root, "CHANGELOG.md"), "utf8"));
}
