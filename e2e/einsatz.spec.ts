import type { Server } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Einsatz anlegen, wechseln, abschließen und auf ein anderes Gerät übertragen", async ({
  browser,
}) => {
  const geraetA = await browser.newContext();
  const seite = await geraetA.newPage();
  await seite.goto(`${baseURL}/einsatz/`);

  // Zwei Einsätze anlegen; der zuletzt angelegte ist aktiv.
  for (const [stichwort, ort] of [
    ["Übung ABC", "Gerätehaus"],
    ["ABC 2", "Werk Nord"],
  ]) {
    await seite.getByLabel("Stichwort", { exact: false }).first().fill(stichwort);
    await seite.getByLabel("Ort", { exact: true }).fill(ort);
    await seite.getByRole("button", { name: "Einsatz anlegen" }).click();
    await expect(seite.getByTestId("kopf-einsatz")).toHaveText(stichwort);
  }
  await expect(seite.getByTestId("einsatz-eintrag")).toHaveCount(2);

  // Wechseln.
  const uebung = seite.getByTestId("einsatz-eintrag").filter({ hasText: "Übung ABC" });
  await uebung.getByRole("button", { name: "Auswählen" }).click();
  await expect(seite.getByTestId("kopf-einsatz")).toHaveText("Übung ABC");

  // Abschließen zeigt die Erinnerung an die Sicherung.
  await uebung.getByRole("button", { name: "Abschließen" }).click();
  await expect(uebung.getByText("abgeschlossen", { exact: true })).toBeVisible();
  await expect(uebung.getByRole("button", { name: "Jetzt sichern" })).toBeVisible();

  // Startseite zeigt den aktiven Einsatz.
  await seite.getByRole("link", { name: "Start" }).click();
  await expect(seite.getByTestId("aktiver-einsatz")).toContainText("Übung ABC");

  // Alles sichern.
  await seite.goto(`${baseURL}/einsatz/`);
  const download = seite.waitForEvent("download");
  await seite.getByRole("button", { name: "Alles sichern (JSON)" }).click();
  // Eigener Temp-Ordner: setInputFiles scheitert still an Pfaden mit Umlauten
  // (der Ausgabeordner von Playwright enthält den Testtitel).
  const datei = path.join(await mkdtemp(path.join(tmpdir(), "lagekit-")), "sicherung.json");
  await (await download).saveAs(datei);
  const inhalt = JSON.parse(await readFile(datei, "utf8"));
  expect(inhalt.format).toBe("lagekit-export");
  expect(inhalt.einsaetze).toHaveLength(2);
  await geraetA.close();

  // Gerät B ist leer und übernimmt die Sicherung.
  const geraetB = await browser.newContext();
  const seiteB = await geraetB.newPage();
  await seiteB.goto(`${baseURL}/einsatz/`);
  await expect(seiteB.getByText("Noch keine Einsätze auf diesem Gerät.")).toBeVisible();
  await seiteB.getByTestId("import-datei").setInputFiles(datei);
  await expect(seiteB.getByText(/Import abgeschlossen: 2 neue/)).toBeVisible();
  await expect(seiteB.getByTestId("einsatz-eintrag")).toHaveCount(2);

  // Erneuter Import verdoppelt nichts.
  await seiteB.getByTestId("import-datei").setInputFiles(datei);
  await expect(seiteB.getByText(/2 unveränderte Einsätze/)).toBeVisible();
  await expect(seiteB.getByTestId("einsatz-eintrag")).toHaveCount(2);

  // Löschen mit Rückfrage.
  const abc = seiteB.getByTestId("einsatz-eintrag").filter({ hasText: "ABC 2" });
  await abc.getByRole("button", { name: "Löschen" }).click();
  await abc.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(seiteB.getByTestId("einsatz-eintrag")).toHaveCount(1);
  await geraetB.close();
});

test("lehnt eine fremde Datei beim Import ab", async ({ page }) => {
  await page.goto(`${baseURL}/einsatz/`);
  const pfad = path.join(await mkdtemp(path.join(tmpdir(), "lagekit-")), "fremd.json");
  await writeFile(pfad, JSON.stringify({ hallo: "welt" }));
  await page.getByTestId("import-datei").setInputFiles(pfad);
  await expect(page.getByText(/keine Lagekit-Sicherung/)).toBeVisible();
});

test("laufenden Einsatz bearbeiten und Änderung im Tagebuch sehen", async ({ page }) => {
  await page.goto(`${baseURL}/`);
  await page.getByLabel("Stichwort", { exact: false }).fill("TH 1");
  await page.getByLabel("Ort", { exact: true }).fill("Hauptstraße 1");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("TH 1");

  // Von der Startseite aus: Stichwort und Ort ändern.
  const karte = page.getByTestId("aktiver-einsatz");
  await karte.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(karte.getByLabel("Stichwort", { exact: false })).toHaveValue("TH 1");
  await karte.getByLabel("Stichwort", { exact: false }).fill("TH 2 VU eingeklemmt");
  await karte.getByLabel("Ort", { exact: true }).fill("Hauptstraße 3");
  await karte.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("TH 2 VU eingeklemmt");
  await expect(karte).toContainText("Hauptstraße 3");

  // Abbrechen ändert nichts.
  await karte.getByRole("button", { name: "Bearbeiten" }).click();
  await karte.getByLabel("Stichwort", { exact: false }).fill("Verworfen");
  await karte.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("TH 2 VU eingeklemmt");

  // In der Einsatzliste: Einheit nachtragen.
  await page.goto(`${baseURL}/einsatz/`);
  const eintrag = page.getByTestId("einsatz-eintrag").first();
  await eintrag.getByRole("button", { name: "Bearbeiten" }).click();
  await eintrag.getByLabel("Eigene Einheit").fill("ELW 1");
  await eintrag.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(eintrag.getByTestId("einsatz-bearbeiten")).toHaveCount(0);
  await expect(eintrag).toContainText("ELW 1");

  // Beide Änderungen stehen im Einsatztagebuch.
  await page.goto(`${baseURL}/tools/einsatztagebuch/`);
  const vermerke = page.getByTestId("tagebuch-eintrag");
  await expect(vermerke).toHaveCount(2);
  await expect(page.getByText("Stichwort: „TH 1“ → „TH 2 VU eingeklemmt“")).toBeVisible();
  await expect(page.getByText("Eigene Einheit: (leer) → „ELW 1“")).toBeVisible();
});

test("Formulare zeigen Fehler direkt am Feld", async ({ page }) => {
  await page.goto(`${baseURL}/einsatz/`);
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByText("Bitte ein Stichwort angeben.")).toBeVisible();
  await expect(page.getByLabel("Stichwort", { exact: false }).first()).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Stichwort", { exact: false }).first().fill("Übung");
  await expect(page.getByText("Bitte ein Stichwort angeben.")).toBeHidden();
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("Übung");

  await page.goto(`${baseURL}/tools/strahlenexposition/`);
  await page.getByLabel("Name *").fill("Anna");
  await page.getByRole("button", { name: "Person anlegen" }).click();
  const start = page.getByRole("form", { name: "Aufenthalt starten" }).first();
  await start.getByLabel("Ort", { exact: true }).fill("Tank 3");
  await start.getByLabel("Ortsdosisleistung (ODL)").fill("viel");
  await start.getByRole("button", { name: "Aufenthalt starten" }).click();
  await expect(start.getByText("Bitte die ODL als Zahl eingeben, z. B. 0,5.")).toBeVisible();
});
