import type { ChangelogAbschnitt } from "../src/core/aenderungen/changelog";

export function appVersion(): string;
export function appCommit(): string;
export function appChangelog(): ChangelogAbschnitt[];
export function kurzcodeDienst(): string;
export function basisPfad(): string;
export function umzugAdresse(): string;
