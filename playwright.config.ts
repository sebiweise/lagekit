import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-End-Tests gegen den statischen Export in out/.
 * Vorher `pnpm build` ausführen. Jeder Test startet seinen eigenen Server,
 * damit er ihn mitten im Test abschalten kann (echter Netzausfall).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
