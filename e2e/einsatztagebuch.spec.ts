import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Einsatztagebuch: Schnellerfassung, Tastenkürzel, Korrektur, Filter, Druck", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-14T14:00:00") });
  await page.goto(`${baseURL}/app/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("Übungsabend");
  await page.locator("#einsatz-einheit").fill("ELW 1");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("Übungsabend");

  await page.goto(`${baseURL}/app/tools/einsatztagebuch/`);
  const inhalt = page.getByLabel("Inhalt");
  await expect(inhalt).toBeFocused();

  // Erster Eintrag: nur tippen und Enter.
  await page.getByLabel("Verfasser").fill("Weber");
  await inhalt.fill("Einsatzbeginn, ELW besetzt");
  await inhalt.press("Enter");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);
  await expect(inhalt).toHaveValue("");
  await expect(inhalt).toBeFocused();

  // Alt+2 wählt „Befehl“, von/an bleiben stehen.
  await page.getByLabel("Von", { exact: true }).fill("EL");
  await page.getByLabel("An", { exact: true }).fill("Messtrupp 1");
  await inhalt.focus();
  await page.keyboard.press("Alt+2");
  await expect(page.getByRole("radio", { name: "Befehl" })).toBeChecked();
  await inhalt.fill("Messung an Messpunkt 3");
  await inhalt.press("Enter");

  // Nachgetragener Eintrag mit eigener Uhrzeit.
  await page.keyboard.press("Alt+1");
  await page.getByLabel("Uhrzeit").fill("13:45");
  await inhalt.fill("3 Verletzte gemeldet");
  await inhalt.press("Enter");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(3);
  const nr3 = page.locator('[data-testid="tagebuch-eintrag"][data-nr="3"]');
  await expect(nr3).toContainText("13:45");
  await expect(nr3).toContainText("nachgetragen um 14:00");

  // Korrektur: neuer Eintrag, alter bleibt durchgestrichen erhalten.
  await nr3.getByRole("button", { name: /korrigieren/ }).click();
  await expect(inhalt).toHaveValue("3 Verletzte gemeldet");
  await inhalt.fill("2 Verletzte gemeldet");
  await inhalt.press("Enter");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(4);
  await expect(nr3.getByTestId("korrigiert-marker")).toHaveText("korrigiert durch Nr. 4");
  await expect(nr3.getByRole("button", { name: /korrigieren/ })).toHaveCount(0);

  // Es gibt keine Löschfunktion.
  await expect(page.getByRole("button", { name: /löschen/i })).toHaveCount(0);

  // Filter und Suche.
  await page.getByRole("button", { name: "Befehl", exact: true }).click();
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);
  await page.getByRole("button", { name: "Befehl", exact: true }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("/");
  await expect(page.getByLabel("Tagebuch durchsuchen")).toBeFocused();
  await page.keyboard.type("verletzte");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(2);
  await expect(page.getByText("2 von 4 Einträgen")).toBeVisible();

  // Druckfassung chronologisch nach Ereigniszeit: der nachgetragene Eintrag steht vorn.
  await page.getByRole("link", { name: "Tagebuch drucken (PDF)" }).click();
  const zeilen = page.getByTestId("tagebuch-druck").locator("tbody tr");
  await expect(zeilen).toHaveCount(4);
  await expect(zeilen.first()).toContainText("13:45");
  await expect(page.getByTestId("tagebuch-druck")).toContainText("Einsatztagebuch: Übungsabend");
  await expect(page.getByTestId("tagebuch-druck")).toContainText("ELW 1");

  // CSV.
  await page.goto(`${baseURL}/app/tools/einsatztagebuch/`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tagebuch als CSV" }).click();
  expect((await download).suggestedFilename()).toBe("lagekit-2026-11-14-uebungsabend-tagebuch.csv");
});
