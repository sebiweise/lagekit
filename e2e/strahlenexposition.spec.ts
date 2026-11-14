import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Dosisüberwachung: Trupp, laufender Aufenthalt, Nachtrag, Ampel, Nachweis", async ({ page }) => {
  // Feste Uhr, damit Dosiswerte exakt prüfbar sind.
  await page.clock.install({ time: new Date("2026-11-14T10:00:00") });

  await page.goto(`${baseURL}/tools/strahlenexposition/`);
  await expect(page.getByText("Kein Einsatz aktiv").first()).toBeVisible();

  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("ABC 2");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("ABC 2");

  // Kachel auf der Startseite führt zum Tool.
  await page.goto(`${baseURL}/`);
  await page.getByRole("link", { name: /Strahlenexposition/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Strahlenexposition" })).toBeVisible();

  for (const name of ["Meier", "Schulz"]) {
    await page.getByLabel("Name *").fill(name);
    await page.getByLabel("Trupp", { exact: true }).fill("AT 1");
    await page.getByRole("button", { name: "Person anlegen" }).click();
  }
  await expect(page.getByTestId("person-karte")).toHaveCount(2);

  // Trupp gemeinsam starten: 600 µSv/h.
  const trupp = page.getByTestId("trupp-steuerung");
  const start = trupp.getByRole("form", { name: "Trupp starten" });
  await start.getByLabel("Ort", { exact: true }).fill("Halle 3");
  await start.getByLabel("Ortsdosisleistung (ODL)").fill("600");
  await start.getByRole("button", { name: "Trupp starten" }).click();
  await expect(page.getByTestId("laufender-aufenthalt")).toHaveCount(2);

  // 30 Minuten später: 0,300 mSv.
  await page.clock.runFor(30 * 60 * 1000);
  const meier = page.locator('[data-person="Meier"]');
  await expect(meier.getByTestId("laufende-dosis")).toHaveText("0,300 mSv");
  await expect(meier.getByTestId("restzeit")).toContainText("Verbleibende Zeit bis zum Richtwert");

  await trupp.getByRole("button", { name: /Trupp beenden/ }).click();
  await expect(page.getByTestId("laufender-aufenthalt")).toHaveCount(0);
  await expect(meier.getByTestId("gesamtdosis")).toHaveText("0,300 mSv");
  await expect(meier.getByText("D = 0,600 mSv/h × 0,5000 h = 0,300 mSv")).toBeVisible();

  // Nachtrag mit hoher Dosis treibt Schulz über 80 % des Richtwerts (100 mSv).
  const schulz = page.locator('[data-person="Schulz"]');
  await schulz.locator("summary", { hasText: "Aufenthalt nachtragen" }).click();
  await schulz.getByLabel("Ort", { exact: true }).last().fill("Messpunkt 2");
  await schulz.getByLabel("Beginn", { exact: true }).fill("2026-11-14T08:00");
  await schulz.getByLabel("Ende", { exact: true }).fill("2026-11-14T09:00");
  await schulz.getByLabel("Ortsdosisleistung (ODL)").last().fill("85");
  await schulz.getByLabel("Einheit der ODL").last().selectOption("mSv/h");
  await schulz.getByRole("button", { name: "Aufenthalt nachtragen" }).click();
  await expect(schulz.getByTestId("gesamtdosis")).toHaveText("85,300 mSv");
  await expect(schulz.getByTestId("ampel")).toHaveAttribute("data-ampel", "gelb");
  await expect(meier.getByTestId("ampel")).toHaveAttribute("data-ampel", "gruen");

  // Vorplanung: 5 mSv/h bei 100 mSv Richtwert, 0 mSv bisher → 20 h.
  await page.getByLabel("Ortsdosisleistung (ODL)").last().fill("5");
  await page.getByLabel("Einheit der ODL").last().selectOption("mSv/h");
  await expect(page.getByTestId("vorplanung-ergebnis")).toContainText("Höchstens 20 h 00 min");

  // Nachweis enthält beide Personen mit Summen.
  await page.getByRole("link", { name: "Dosisnachweis (PDF)" }).click();
  await expect(page.getByTestId("nachweis-person")).toHaveCount(2);
  await expect(
    page.getByTestId("nachweis-person").filter({ hasText: "Schulz" }).getByTestId("nachweis-gesamt"),
  ).toHaveText("85,300 mSv");

  // CSV-Export.
  await page.goto(`${baseURL}/tools/strahlenexposition/`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Gesamtübersicht (CSV)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^lagekit-2026-11-14-abc-2-dosis\.csv$/);
});

test("Trupp: Messwert in Sv/h wechseln und Aufenthalt für den Trupp nachtragen", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-14T10:00:00") });
  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("ABC 3");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("ABC 3");

  await page.goto(`${baseURL}/tools/strahlenexposition/`);
  for (const name of ["Meier", "Schulz"]) {
    await page.getByLabel("Name *").fill(name);
    await page.getByLabel("Trupp", { exact: true }).fill("AT 1");
    await page.getByRole("button", { name: "Person anlegen" }).click();
  }
  // Ab hier steht die Uhr; Zeit vergeht nur über runFor, damit die Dosiswerte exakt sind.
  await page.clock.pauseAt(new Date("2026-11-14T10:05:00"));
  const trupp = page.getByTestId("trupp-steuerung");
  const start = trupp.getByRole("form", { name: "Trupp starten" });
  await start.getByLabel("Ort", { exact: true }).fill("Halle 3");
  await start.getByLabel("Ortsdosisleistung (ODL)").fill("1");
  await start.getByLabel("Einheit der ODL").selectOption("mSv/h");
  await start.getByRole("button", { name: "Trupp starten" }).click();
  await expect(page.getByTestId("laufender-aufenthalt")).toHaveCount(2);

  // Nach 30 min neuer Messwert: 0,002 Sv/h = 2 mSv/h.
  await page.clock.runFor(30 * 60 * 1000);
  await trupp.locator("summary", { hasText: "Neuer Messwert oder Ortswechsel" }).click();
  const wechsel = trupp.getByRole("form", { name: "Neuen Wert für den Trupp übernehmen" });
  await wechsel.getByLabel("Ort", { exact: true }).fill("Halle 4");
  await wechsel.getByLabel("Ortsdosisleistung (ODL)").fill("0,002");
  await wechsel.getByLabel("Einheit der ODL").selectOption("Sv/h");
  await wechsel.getByRole("button", { name: "Neuen Wert für den Trupp übernehmen" }).click();

  const meier = page.locator('[data-person="Meier"]');
  await expect(meier.getByTestId("laufender-aufenthalt")).toContainText("Halle 4");
  await expect(meier.getByTestId("laufender-aufenthalt")).toContainText("0,002 Sv/h");
  await page.clock.runFor(15 * 60 * 1000);
  await expect(meier.getByTestId("laufende-dosis")).toHaveText("0,500 mSv");
  await trupp.getByRole("button", { name: /Trupp beenden/ }).click();
  await expect(meier.getByTestId("gesamtdosis")).toHaveText("1,000 mSv");

  // Nachtrag für den ganzen Trupp: 1 h bei 3 mSv/h.
  await trupp.locator("summary", { hasText: "Aufenthalt für den Trupp nachtragen" }).click();
  const nachtrag = trupp.getByRole("form", { name: "Aufenthalt nachtragen" });
  await nachtrag.getByLabel("Ort", { exact: true }).fill("Messpunkt 1");
  await nachtrag.getByLabel("Beginn", { exact: true }).fill("2026-11-14T08:00");
  await nachtrag.getByLabel("Ende", { exact: true }).fill("2026-11-14T09:00");
  await nachtrag.getByLabel("Ortsdosisleistung (ODL)").fill("3");
  await nachtrag.getByLabel("Einheit der ODL").selectOption("mSv/h");
  await nachtrag.getByRole("button", { name: "Für den Trupp nachtragen" }).click();
  await expect(meier.getByTestId("gesamtdosis")).toHaveText("4,000 mSv");
  await expect(page.locator('[data-person="Schulz"]').getByTestId("gesamtdosis")).toHaveText("4,000 mSv");
});
