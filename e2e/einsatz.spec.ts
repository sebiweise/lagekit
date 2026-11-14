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
