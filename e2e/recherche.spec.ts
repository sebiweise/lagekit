import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Externe Tools: Vorschläge zum Einsatz, Direktsuche und Kopieren landen im Verlauf", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Externe Ziele nicht wirklich aufrufen.
  await context.route(/^https:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 200, body: "extern" }));

  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("TH VU Pkw");
  await page.locator("#einsatz-ort").fill("Kassel");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("TH VU Pkw");

  await page.goto(`${baseURL}/tools/recherche/`);
  const vorschlaege = page.getByTestId("vorschlaege");
  await expect(vorschlaege.getByTestId("externes-tool").first()).toHaveAttribute("data-tool", "adac-rettungskarten");
  // Alle übrigen Tools bleiben erreichbar.
  await expect(page.locator('[data-tool="gestis"]')).toBeVisible();
  await expect(page.getByLabel("Ort")).toHaveValue("Kassel");

  await page.getByLabel("Suchbegriff").fill("Abschleppdienst");
  const oertliche = page.locator('[data-tool="dasoertliche"]');
  const [direkt] = await Promise.all([
    page.waitForEvent("popup"),
    oertliche.getByRole("link", { name: "Suchen" }).click(),
  ]);
  expect(direkt.url()).toBe("https://www.dasoertliche.de/?kw=Abschleppdienst&ci=Kassel&form_name=search_nat");
  await direkt.close();

  await page.getByLabel("Suchbegriff").fill("UN 1005");
  const gestis = page.locator('[data-tool="gestis"]');
  const [kopie] = await Promise.all([
    page.waitForEvent("popup"),
    gestis.getByRole("link", { name: "Begriff kopieren und öffnen" }).click(),
  ]);
  await kopie.close();
  await expect(gestis.getByRole("status")).toContainText("„UN 1005“ kopiert");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("UN 1005");

  const verlauf = page.getByTestId("verlauf-eintrag");
  await expect(verlauf).toHaveCount(2);
  await expect(verlauf.first()).toContainText("UN 1005");
  await expect(verlauf.nth(1)).toContainText("Abschleppdienst in Kassel");

  // Verlauf übersteht ein Neuladen.
  await page.reload();
  await expect(page.getByTestId("verlauf-eintrag")).toHaveCount(2);
});
