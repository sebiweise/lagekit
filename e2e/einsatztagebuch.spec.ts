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
  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("Übungsabend");
  await page.locator("#einsatz-einheit").fill("ELW 1");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("Übungsabend");

  await page.goto(`${baseURL}/tools/einsatztagebuch/`);
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
  await expect(page.getByRole("group", { name: "Art", exact: true }).getByRole("button", { name: "Befehl" })).toHaveAttribute("aria-pressed", "true");
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
  await page.getByRole("group", { name: "Nach Art filtern" }).getByRole("button", { name: "Befehl" }).click();
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);
  await page.getByRole("group", { name: "Nach Art filtern" }).getByRole("button", { name: "Befehl" }).click();
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
  await page.goto(`${baseURL}/tools/einsatztagebuch/`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tagebuch als CSV" }).click();
  expect((await download).suggestedFilename()).toBe("lagekit-2026-11-14-uebungsabend-tagebuch.csv");
});

test("Einsatztagebuch: Von/An schlagen genutzte Angaben vor, Tab ergänzt", async ({ page }) => {
  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("Übungsabend");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await page.goto(`${baseURL}/tools/einsatztagebuch/`);

  const inhalt = page.getByLabel("Inhalt");
  const von = page.getByLabel("Von", { exact: true });
  const an = page.getByLabel("An", { exact: true });
  await von.fill("Leitstelle");
  await an.fill("ELW 1");
  await inhalt.fill("Alarmierung");
  await inhalt.press("Enter");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);

  // Graue Ergänzung im Feld, Tab übernimmt sie und bleibt im Feld.
  await von.fill("");
  await von.pressSequentially("el");
  await expect(page.getByTestId("tb-von-ergaenzung")).toHaveText("elW 1");
  await von.press("Tab");
  await expect(von).toHaveValue("ELW 1");
  await expect(von).toBeFocused();

  // Ohne Vorschlag wechselt Tab wie gewohnt das Feld.
  await von.press("Tab");
  await expect(page.getByRole("button", { name: "Von und An tauschen" })).toBeFocused();

  // Liste: Pfeiltaste wählt, Enter übernimmt ohne zu speichern.
  await an.fill("");
  await an.pressSequentially("st");
  await expect(page.getByRole("option", { name: "Leitstelle" })).toBeVisible();
  await an.press("ArrowDown");
  await an.press("Enter");
  await expect(an).toHaveValue("Leitstelle");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);

  // Esc schließt nur die Liste, der Inhalt bleibt stehen.
  await inhalt.fill("Rückmeldung");
  await an.fill("");
  await an.pressSequentially("L");
  await expect(page.getByRole("listbox", { name: "Vorschläge" })).toBeVisible();
  await an.press("Escape");
  await expect(page.getByRole("listbox", { name: "Vorschläge" })).toHaveCount(0);
  await expect(inhalt).toHaveValue("Rückmeldung");

  // Antippen übernimmt ebenfalls.
  await an.fill("");
  await an.click();
  await page.getByRole("option", { name: "Leitstelle" }).click();
  await expect(an).toHaveValue("Leitstelle");
});
