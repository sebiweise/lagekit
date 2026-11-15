import { migrations, SCHEMA_VERSION } from "@/core/db/migrations";
import { APP_COMMIT, APP_VERSION } from "@/core/version";
import type { ChangelogAbschnitt } from "./changelog";
import type { VersionInfo } from "./version-info";

function changelogAusBuild(): ChangelogAbschnitt[] {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_APP_CHANGELOG ?? "[]") as ChangelogAbschnitt[];
  } catch {
    return [];
  }
}

/** Angaben der laufenden App; der Service Worker baut dieselbe Angabe für sich. */
export const AKTUELLE_VERSION: VersionInfo = {
  version: APP_VERSION,
  commit: APP_COMMIT,
  schemaVersion: SCHEMA_VERSION,
  migrationen: migrations.map(({ version, beschreibung }) => ({ version, beschreibung })),
  changelog: changelogAusBuild(),
};
