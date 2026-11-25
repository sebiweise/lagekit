import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

/** Startseite, Dokumentation und App unter /app/; alte Adressen (bis Version 0.4) führen in die App. */

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Startseite für neue Besucher, danach direkt in die App", async ({ page }) => {
  await page.goto(`${baseURL}/`);
  await expect(page.getByRole("heading", { level: 1, name: /Offline-Toolbox/ })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "App öffnen" }).click();
  await expect(page).toHaveURL(`${baseURL}/app/`);
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");

  // Wer die App nutzt (auch ELW-PCs mit Lesezeichen auf /), landet sofort in der App.
  await page.goto(`${baseURL}/`);
  await expect(page).toHaveURL(`${baseURL}/app/`);
  await page.goto(`${baseURL}/?ueber`);
  await expect(page.getByRole("heading", { level: 1, name: /Offline-Toolbox/ })).toBeVisible();
});

test("installierte App mit alter Startadresse / öffnet die App", async ({ browser }) => {
  const context = await browser.newContext();
  // Wie eine vom Home-Bildschirm gestartete App (iOS: navigator.standalone).
  await context.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  const page = await context.newPage();
  await page.goto(`${baseURL}/?sitzung=1#x`);
  await expect(page).toHaveURL(`${baseURL}/app/?sitzung=1#x`);
  await context.close();
});

test("alte Adressen führen in die App, auch offline", async ({ page, context }) => {
  await page.goto(`${baseURL}/tools/einsatztagebuch/?filter=1#oben`);
  await expect(page).toHaveURL(`${baseURL}/app/tools/einsatztagebuch/?filter=1#oben`);
  await expect(page.getByRole("heading", { level: 1, name: "Einsatztagebuch" })).toBeVisible();

  await page.goto(`${baseURL}/app/`);
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");
  await stoppeServer(server);
  await context.setOffline(true);

  await page.goto(`${baseURL}/einsatz/`);
  await expect(page).toHaveURL(`${baseURL}/app/einsatz/`);
  await expect(page.getByRole("heading", { level: 1, name: "Einsätze" })).toBeVisible();

  // Dokumentation ist nach dem ersten Laden der App ebenfalls offline da.
  await page.goto(`${baseURL}/docs/betrieb/docker/`);
  await expect(page.getByRole("heading", { level: 1, name: "Docker" })).toBeVisible();
});

test("Dokumentation mit Navigation und Links zwischen den Seiten", async ({ page }) => {
  await page.goto(`${baseURL}/docs/`);
  await expect(page.getByRole("heading", { level: 1, name: "Dokumentation" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: /Cloudflare Pages/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cloudflare Pages" })).toBeVisible();
  // Links im Markdown tragen den Basispfad (BASE_PATH) selbst.
  const kurzcode = new URL(`${baseURL}/docs/betrieb/kurzcode/`).pathname;
  await page.locator(`main a[href="${kurzcode}"]`).first().click();
  await expect(page).toHaveURL(`${baseURL}/docs/betrieb/kurzcode/`);
  await page.goto(`${baseURL}/docs/gibt-es-nicht/`);
  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
});
