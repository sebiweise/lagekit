// Release-Hilfen für die GitHub-Workflows (auch lokal nutzbar).
//
//   node scripts/release.mjs vorbereiten <patch|minor|major> [datum]
//     Trägt „Unveröffentlicht“ als neue Version in CHANGELOG.md ein, erhöht die
//     Version in package.json und gibt die neue Version aus.
//   node scripts/release.mjs notizen [version]
//     Gibt den Abschnitt der Version (Standard: package.json) als Markdown aus.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abschnittAlsMarkdown,
  changelogLesen,
  istLeer,
  releaseEintragen,
  versionErhoehen,
} from "../src/core/aenderungen/changelog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changelogPfad = path.join(root, "CHANGELOG.md");
const packagePfad = path.join(root, "package.json");

function fehler(text) {
  console.error(text);
  process.exit(1);
}

const [befehl, ...argumente] = process.argv.slice(2);
const changelog = readFileSync(changelogPfad, "utf8");
const paket = readFileSync(packagePfad, "utf8");
const version = JSON.parse(paket).version;

if (befehl === "vorbereiten") {
  const [art, datum = new Date().toISOString().slice(0, 10)] = argumente;
  if (!["patch", "minor", "major"].includes(art)) fehler("Art fehlt: patch, minor oder major.");
  const abschnitte = changelogLesen(changelog);
  if (istLeer(abschnitte.find((a) => a.version === null))) {
    fehler("CHANGELOG.md: Unter „Unveröffentlicht“ steht nichts. Ohne Änderungen kein Release.");
  }
  const neu = versionErhoehen(version, art);
  if (abschnitte.some((a) => a.version === neu)) fehler(`Version ${neu} steht schon in CHANGELOG.md.`);
  writeFileSync(changelogPfad, releaseEintragen(changelog, neu, datum));
  writeFileSync(packagePfad, paket.replace(`"version": "${version}"`, `"version": "${neu}"`));
  console.log(neu);
} else if (befehl === "notizen") {
  const gesucht = argumente[0] ?? version;
  const abschnitt = changelogLesen(changelog).find((a) => a.version === gesucht);
  if (!abschnitt) fehler(`Version ${gesucht} fehlt in CHANGELOG.md.`);
  console.log(abschnittAlsMarkdown(abschnitt));
} else {
  fehler("Befehl: vorbereiten <patch|minor|major> | notizen [version]");
}
