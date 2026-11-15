import type { ChangelogAbschnitt } from "../src/core/aenderungen/changelog";

export function appVersion(): string;
export function appCommit(): string;
export function appChangelog(): ChangelogAbschnitt[];
