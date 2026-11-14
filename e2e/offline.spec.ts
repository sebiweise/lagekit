import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("startet nach dem ersten Laden ohne Netz", async ({ page, context }) => {
  await page.goto(`${baseURL}/`);
  await expect(page.getByRole("heading", { level: 1, name: "Lagekit" })).toBeVisible();
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");
  await expect(page.getByTestId("app-version")).toContainText("Version");

  // Netz weg: Server aus und Browser offline.
  await stoppeServer(server);
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Lagekit" })).toBeVisible();
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");

  // Client-Navigation zu einer anderen Route.
  await page.getByRole("link", { name: /Hinweise/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hinweise" })).toBeVisible();

  // Direkter Aufruf einer Unterseite (harte Navigation), mit und ohne Schrägstrich.
  await page.goto(`${baseURL}/hinweise/`);
  await expect(page.getByRole("heading", { name: "Haftungshinweis" })).toBeVisible();
  await page.goto(`${baseURL}/hinweise`);
  await expect(page.getByRole("heading", { name: "Haftungshinweis" })).toBeVisible();

  // Unbekannte Adresse zeigt die eigene 404-Seite statt eines Browserfehlers.
  await page.goto(`${baseURL}/gibt-es-nicht/`);
  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
});

test("lädt keine Ressourcen von fremden Servern", async ({ page }) => {
  const fremd: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(baseURL) && !request.url().startsWith("data:")) {
      fremd.push(request.url());
    }
  });
  await page.goto(`${baseURL}/`);
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");
  await page.goto(`${baseURL}/hinweise/`);
  expect(fremd).toEqual([]);
});
