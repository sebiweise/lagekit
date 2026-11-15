import type { Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

async function befehl(page: Page, eingabe: string) {
  await page.keyboard.press("ControlOrMeta+k");
  const feld = page.getByRole("combobox", { name: "Befehl oder Suchbegriff" });
  await expect(feld).toBeFocused();
  await feld.fill(eingabe);
  await feld.press("Enter");
  await expect(feld).toBeHidden();
}

test("Befehlspalette: Strg+K, Tagebuch, Einsatz anlegen, wechseln, Suche, Darstellung", async ({ page }) => {
  await page.goto(`${baseURL}/app/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("Brand Lager");
  await page.locator("#einsatz-ort").fill("Musterstadt");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("Brand Lager");
  await page.goto(`${baseURL}/app/`);

  // Tagebuch-Eintrag: wechselt zum Tagebuch, Cursor steht in der Eingabezeile.
  await befehl(page, "eintrag tageb");
  await expect(page).toHaveURL(/\/app\/tools\/einsatztagebuch\/$/);
  await expect(page.getByLabel("Inhalt")).toBeFocused();

  // Neuer Einsatz: Formular geht auf, Cursor im Stichwort.
  await befehl(page, "neuen einsatz");
  await expect(page).toHaveURL(/\/app\/einsatz\/$/);
  await expect(page.locator("#einsatz-stichwort")).toBeFocused();
  await page.locator("#einsatz-stichwort").fill("ABC Übung");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("ABC Übung");

  // Einsatz wechseln, auch mit Umlaut-Schreibweise und über den Ort.
  await befehl(page, "musterstadt");
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("Brand Lager");

  // Einsatz bearbeiten öffnet das Formular des ausgewählten Einsatzes.
  await page.goto(`${baseURL}/app/`);
  await befehl(page, "einsatz bearb");
  await expect(page.getByTestId("einsatz-bearbeiten")).toBeVisible();

  // Freier Begriff: „… in externen Tools suchen“ steht oben und öffnet die Suche mit dem Begriff.
  await befehl(page, "UN 1005");
  await expect(page).toHaveURL(/\/app\/suche\/\?q=UN%201005$/);
  await expect(page.locator("#suche-begriff")).toHaveValue("UN 1005");
  await expect(page.getByTestId("direktsuche")).toBeVisible();

  // Darstellung umschalten.
  await befehl(page, "dunkel");
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Knopf in der Kopfzeile, Esc schließt, nichts gefunden.
  await page.getByTestId("befehle-knopf").click();
  const feld = page.getByRole("combobox", { name: "Befehl oder Suchbegriff" });
  await expect(feld).toBeFocused();
  await expect(page.getByTestId("befehl").first()).toBeVisible();
  await feld.press("Escape");
  await expect(feld).toBeHidden();
});

test("Löschen fragt in einem Dialog nach, Abbrechen behält den Einsatz", async ({ page }) => {
  await page.goto(`${baseURL}/app/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("Probe");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await page.getByTestId("einsatz-eintrag").getByRole("button", { name: "Löschen" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("„Probe“ löschen?");
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("einsatz-eintrag")).toHaveCount(1);
});

test("Am Handy öffnet „Mehr“ die Befehlspalette", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/app/`);
  await expect(page.getByTestId("befehle-knopf")).toBeHidden();
  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByTestId("mehr-befehle").click();
  const feld = page.getByRole("combobox", { name: "Befehl oder Suchbegriff" });
  await expect(feld).toBeVisible();
  await feld.fill("strahlen");
  await feld.press("Enter");
  await expect(page).toHaveURL(/\/app\/tools\/strahlenexposition\/$/);
});
