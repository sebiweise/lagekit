import type { Server } from "node:http";
import { expect, test, type BrowserContext } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

const KASSEL = { latitude: 51.3127, longitude: 9.4797, accuracy: 12 };

/** Adressdienst und Kartenkacheln im Test nachgebildet (kein Internet im Test). */
async function osmNachbilden(kontext: BrowserContext) {
  const anfragen: string[] = [];
  await kontext.route("https://nominatim.openstreetmap.org/**", async (route) => {
    const url = route.request().url();
    anfragen.push(url);
    if (url.includes("/reverse")) {
      await route.fulfill({
        json: {
          lat: "51.3127",
          lon: "9.4797",
          display_name: "8, Obere Königsstraße, Mitte, Kassel, Hessen, 34117, Deutschland",
          address: { road: "Obere Königsstraße", house_number: "8", postcode: "34117", city: "Kassel" },
        },
      });
    } else {
      await route.fulfill({
        json: [{ lat: "51.3155", lon: "9.4979", display_name: "Hauptbahnhof, Kassel", address: { road: "Rainer-Dierichs-Platz", city: "Kassel" } }],
      });
    }
  });
  await kontext.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204 }));
  return anfragen;
}

test("Einsatzort per Standort übernehmen, auf der Karte sehen und neu setzen", async ({ browser }) => {
  const kontext = await browser.newContext({ geolocation: KASSEL, permissions: ["geolocation"] });
  const anfragen = await osmNachbilden(kontext);
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/einsatz/`);

  await seite.locator("#einsatz-stichwort").fill("Brand 3");
  await seite.getByTestId("standort-knopf").click();
  await expect(seite.getByLabel("Ort", { exact: true })).toHaveValue("Obere Königsstraße 8, 34117 Kassel");
  await expect(seite.getByTestId("einsatz-koordinaten")).toContainText("32U NB 33433 84708");
  await expect(seite.getByTestId("einsatz-koordinaten")).toContainText("± 12 m");
  await seite.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(seite.getByTestId("kopf-einsatz")).toHaveText("Brand 3");
  expect(anfragen.filter((u) => u.includes("/reverse"))).toHaveLength(1);

  // Karte zeigt den Einsatzort mit UTMREF.
  await seite.goto(`${baseURL}/tools/karte/`);
  const einsatzort = seite.getByTestId("punkt-Einsatzort");
  await expect(einsatzort).toContainText("Obere Königsstraße 8, 34117 Kassel");
  await expect(einsatzort.getByTestId("utmref")).toHaveText("32U NB 33433 84708");
  await expect(seite.locator(".leaflet-container")).toBeVisible();
  await expect(seite.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");

  // Eigener Standort mit Entfernung zum Einsatzort.
  await seite.getByTestId("karte-ich").click();
  await expect(seite.getByTestId("punkt-Mein Standort")).toContainText("± 12 m");

  // Adresse suchen (nur auf Knopfdruck) und als neuen Einsatzort setzen.
  await seite.getByLabel("Adresse oder Ort suchen").fill("Hauptbahnhof Kassel");
  await seite.getByRole("button", { name: "Suchen" }).click();
  await seite.getByRole("button", { name: /Rainer-Dierichs-Platz/ }).click();
  const gewaehlt = seite.getByTestId("punkt-Gewählter Punkt");
  await expect(gewaehlt).toContainText("vom Einsatzort");
  await gewaehlt.getByTestId("als-einsatzort").click();
  await expect(gewaehlt).toHaveCount(0);
  await expect(einsatzort).toContainText("Obere Königsstraße 8"); // Rückwärtssuche (nachgebildet) liefert dieselbe Adresse
  await expect(einsatzort.getByTestId("utmref")).not.toHaveText("32U NB 33433 84708");

  await kontext.close();
});

test("Ohne Netz: Standort wird als Koordinaten übernommen", async ({ browser }) => {
  const kontext = await browser.newContext({ geolocation: KASSEL, permissions: ["geolocation"] });
  const anfragen = await osmNachbilden(kontext);
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/einsatz/`);
  await kontext.setOffline(true);
  await seite.getByTestId("standort-knopf").click();
  await expect(seite.getByLabel("Ort", { exact: true })).toHaveValue("51.31270, 9.47970");
  expect(anfragen).toHaveLength(0);
  await kontext.close();
});

test("Arbeitsbereich: Tools als Tabs öffnen, Eingaben bleiben beim Wechseln, nebeneinander auf großen Bildschirmen", async ({
  browser,
}) => {
  const kontext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await osmNachbilden(kontext);
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/einsatz/`);
  await seite.locator("#einsatz-stichwort").fill("Übung");
  await seite.getByRole("button", { name: "Einsatz anlegen" }).click();

  await seite.getByRole("link", { name: "Arbeitsbereich" }).click();
  const auswahl = seite.getByRole("list", { name: "Tool öffnen" });
  await auswahl.getByRole("button", { name: "Einsatztagebuch" }).click();
  await seite.getByLabel("Inhalt").fill("noch nicht abgeschickt");

  await seite.getByRole("button", { name: "Tool öffnen" }).click();
  await auswahl.getByRole("button", { name: "Karte" }).click();
  await expect(seite.getByTestId("ansicht-karte")).toBeVisible();
  await expect(seite.getByTestId("ansicht-einsatztagebuch")).toBeHidden();

  // Zurück zum Tagebuch: Die Eingabe ist noch da.
  await seite.getByRole("tab", { name: /Einsatztagebuch/ }).click();
  await expect(seite.getByLabel("Inhalt")).toHaveValue("noch nicht abgeschickt");

  // Nebeneinander.
  const aufteilung = seite.getByRole("group", { name: "Aufteilung" });
  await aufteilung.getByRole("button", { name: "Zwei nebeneinander" }).click();
  await expect(seite.getByTestId("ansicht-karte")).toBeVisible();
  await expect(seite.getByTestId("ansicht-einsatztagebuch")).toBeVisible();

  // Nach dem Neuladen sind die Tabs noch da.
  await seite.reload();
  await expect(seite.getByRole("tab")).toHaveCount(2);
  await expect(seite.getByTestId("ansicht-karte")).toBeVisible();

  // Auf dem Handy: immer nur ein Tool.
  await seite.setViewportSize({ width: 390, height: 844 });
  await expect(seite.getByTestId("ansicht-karte")).toBeHidden();
  await expect(seite.getByTestId("ansicht-einsatztagebuch")).toBeVisible();
  await kontext.close();
});

test("Arbeitsbereich selbst anordnen: Raster, Feld wählen, Ziehen, Größe ändern, bleibt gespeichert", async ({ browser }) => {
  const kontext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await osmNachbilden(kontext);
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/einsatz/`);
  await seite.locator("#einsatz-stichwort").fill("Übung");
  await seite.getByRole("button", { name: "Einsatz anlegen" }).click();
  await seite.getByRole("link", { name: "Arbeitsbereich" }).click();
  await seite.getByRole("list", { name: "Tool öffnen" }).getByRole("button", { name: "Einsatztagebuch" }).click();
  await seite.getByLabel("Inhalt").fill("bleibt stehen");

  // Vier Felder: Feld 1 hat das Tagebuch, die anderen sind leer und werden per Auswahl belegt.
  await seite.getByRole("group", { name: "Aufteilung" }).getByRole("button", { name: "Vier im Raster" }).click();
  await expect(seite.getByTestId("feld-leer-2")).toBeVisible();
  await seite.getByLabel("Tool in Feld 2").selectOption({ label: "Karte" });
  await seite.getByLabel("Tool in Feld 3").selectOption({ label: "Strahlenexposition" });
  await seite.getByLabel("Tool in Feld 4").selectOption({ label: "Suche" });
  for (const id of ["einsatztagebuch", "karte", "strahlenexposition", "suche"]) {
    await expect(seite.getByTestId(`ansicht-${id}`)).toBeVisible();
  }
  await expect(seite.getByTestId("ansicht-karte")).toHaveAttribute("data-feld", "2");

  // Alles passt auf den Bildschirm, ohne dass die Seite seitlich oder nach unten wegläuft.
  const ueberlauf = await seite.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight - innerHeight]);
  expect(ueberlauf[0]).toBe(false);
  expect(ueberlauf[1]).toBeLessThanOrEqual(1);

  // Tab „Karte“ auf Feld 1 ziehen: Tagebuch und Karte tauschen, die Eingabe bleibt.
  await seite.getByRole("tab", { name: /Karte/ }).dragTo(seite.getByTestId("ansicht-einsatztagebuch"));
  await expect(seite.getByTestId("ansicht-karte")).toHaveAttribute("data-feld", "1");
  await expect(seite.getByTestId("ansicht-einsatztagebuch")).toHaveAttribute("data-feld", "2");
  await expect(seite.getByLabel("Inhalt")).toHaveValue("bleibt stehen");

  // Spalten breiter ziehen, dann per Tastatur.
  const trenner = seite.getByRole("separator", { name: "Breite der Spalten" });
  const box = (await trenner.boundingBox())!;
  const flaeche = (await seite.getByTestId("arbeitsflaeche").boundingBox())!;
  await seite.mouse.move(box.x + box.width / 2, box.y + 40);
  await seite.mouse.down();
  await seite.mouse.move(flaeche.x + flaeche.width * 0.65, box.y + 40, { steps: 5 });
  await seite.mouse.up();
  await expect(trenner).toHaveAttribute("aria-valuenow", "65");
  await trenner.press("ArrowLeft");
  await expect(trenner).toHaveAttribute("aria-valuenow", "60");

  // Nach dem Neuladen ist alles wie vorher.
  await seite.reload();
  await expect(seite.getByTestId("ansicht-karte")).toHaveAttribute("data-feld", "1");
  await expect(seite.getByTestId("ansicht-suche")).toHaveAttribute("data-feld", "4");
  await expect(seite.getByRole("separator", { name: "Breite der Spalten" })).toHaveAttribute("aria-valuenow", "60");

  // Feld leeren: das Tool bleibt als Tab offen.
  await seite.getByLabel("Tool in Feld 4").selectOption({ label: "Leer" });
  await expect(seite.getByTestId("ansicht-suche")).toBeHidden();
  await expect(seite.getByRole("tab", { name: /Suche/ })).toBeVisible();
  await kontext.close();
});
