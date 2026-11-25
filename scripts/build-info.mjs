// Versionsangaben für App und Service Worker; genutzt von next.config.ts und build-sw.mjs.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changelogLesen } from "../src/core/aenderungen/changelog.ts";
import { basisPfadAus } from "../src/core/pwa/adressen.ts";
import { dienstEndpunktBeimBuild } from "../src/core/sync/dienst-adresse.ts";

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

/**
 * Endpunkt des Vermittlungsdiensts für den Kurzcode aus LAGEKIT_KURZCODE_DIENST;
 * leer heißt „aus“. Docker kann ihn zur Laufzeit überschreiben (/konfiguration.json).
 */
export function kurzcodeDienst() {
  return dienstEndpunktBeimBuild(process.env) ?? "";
}

/**
 * Basispfad aus BASE_PATH, z. B. `/lagekit` für GitHub Pages unter
 * `<name>.github.io/lagekit/`; leer (Standard) für eine eigene (Sub-)Domain.
 */
export function basisPfad() {
  return basisPfadAus(process.env.BASE_PATH);
}

/**
 * Neue Adresse der App aus LAGEKIT_UMZUG_URL, nur beim Build der alten Installation
 * gesetzt: Die App zeigt dann einen Hinweis zum Umzug (src/core/pwa/components/umzug-hinweis.tsx).
 */
export function umzugAdresse() {
  const roh = (process.env.LAGEKIT_UMZUG_URL ?? "").trim();
  if (!roh) return "";
  let url;
  try {
    url = new URL(roh);
  } catch {
    throw new Error(`LAGEKIT_UMZUG_URL: „${roh}“ ist keine Adresse.`);
  }
  if (url.protocol !== "https:") throw new Error(`LAGEKIT_UMZUG_URL: „${roh}“ muss mit https:// beginnen.`);
  return url.href;
}
