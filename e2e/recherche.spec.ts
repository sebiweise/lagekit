import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Suche: Direktsuche, UN-Nummer, Kopieren, Verlauf; Linksammlung mit Vorschlägen", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Externe Ziele nicht wirklich aufrufen.
  await context.route(/^https:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 200, body: "extern" }));

  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("TH VU Pkw");
  await page.locator("#einsatz-ort").fill("Kassel");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("TH VU Pkw");

  await page.getByRole("link", { name: "Suche", exact: true }).click();
  await expect(page.getByLabel("Suchbegriff")).toBeFocused();
  await expect(page.getByLabel("Ort")).toHaveValue("Kassel");

  // Text: Telefonbuch mit Ort aus dem Einsatz.
  await page.getByLabel("Suchbegriff").fill("Abschleppdienst");
  const direkt = page.getByTestId("direktsuche");
  const [oertliche] = await Promise.all([
    page.waitForEvent("popup"),
    direkt.locator('[data-tool="dasoertliche"]').click(),
  ]);
  expect(oertliche.url()).toBe("https://mobil.dasoertliche.de/Themen?was=Abschleppdienst&wo=Kassel");
  await oertliche.close();

  // UN-Nummer: nur Stoffdatenbanken, ohne Ort.
  await page.getByLabel("Suchbegriff").fill("UN 1005");
  await expect(page.getByRole("heading", { name: "UN-Nummer 1005" })).toBeVisible();
  await expect(direkt.locator("a")).toHaveCount(1);
  const [bam] = await Promise.all([page.waitForEvent("popup"), direkt.locator('[data-tool="bam-dgg"]').click()]);
  expect(bam.url()).toBe("https://www.dgg.bam.de/dgginfo/search/query?value=1005&partialWord=true&results=all&lang=de");
  await bam.close();

  // Ohne Direktsuche: Begriff kopieren und Startseite öffnen.
  const gestis = page.getByTestId("kopierziele").locator('[data-tool="gestis"]');
  const [kopie] = await Promise.all([page.waitForEvent("popup"), gestis.click()]);
  expect(kopie.url()).toBe("https://gestis.dguv.de/");
  await kopie.close();
  await expect(gestis).toContainText("„1005“ kopiert");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("1005");

  const verlauf = page.getByTestId("verlauf-eintrag");
  await expect(verlauf).toHaveCount(3);
  await expect(verlauf.nth(2)).toContainText("Abschleppdienst in Kassel");
  await page.reload();
  await expect(page.getByTestId("verlauf-eintrag")).toHaveCount(3);

  // Linksammlung: passende Tools oben, alle anderen erreichbar.
  await page.goto(`${baseURL}/tools/recherche/`);
  await expect(page.getByTestId("vorschlaege").locator("a").first()).toHaveAttribute("data-tool", "adac-rettungskarten");
  await expect(page.locator('[data-tool="gestis"]')).toBeVisible();
});
