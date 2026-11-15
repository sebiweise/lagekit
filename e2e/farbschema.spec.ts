import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

const html = (page: import("@playwright/test").Page) => page.locator("html");

test("folgt ohne eigene Wahl der Systemeinstellung", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`${baseURL}/app/`);
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expect(page.getByTestId("farbschema")).toHaveAttribute("data-farbschema", "system");

  // Systemwechsel wird sofort übernommen.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).toHaveClass(/\blight\b/);
});

test("eigene Wahl bleibt nach dem Neuladen, ohne Aufblitzen", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${baseURL}/app/`);
  const wahl = page.getByTestId("farbschema");
  const hintergrund = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const hell = await hintergrund();

  await page.getByRole("radio", { name: "Hell" }).click();
  await expect(wahl).toHaveAttribute("data-farbschema", "hell");
  await page.getByRole("radio", { name: "Dunkel" }).click();
  await expect(wahl).toHaveAttribute("data-farbschema", "dunkel");
  await expect(html(page)).toHaveClass(/\bdark\b/);

  // Die Klasse steht schon vor dem Hydrieren am <html> (Skript im <head>).
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  expect(await hintergrund()).not.toBe(hell);
  await page.unroute("**/_next/static/**/*.js");

  // Druck bleibt hell.
  await page.emulateMedia({ media: "print" });
  expect(await hintergrund()).toBe(hell);
});
