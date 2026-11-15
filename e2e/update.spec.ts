import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { serveOut } from "../scripts/serve-out.mjs";
import { stoppeServer } from "./server";

/**
 * Update mit Änderungsliste: Eine Kopie von out/ wird ausgeliefert, danach
 * erscheint dort ein geänderter Service Worker, der sich als Version 99.0.0
 * mit Datenbank-Umbau ausgibt.
 */
let server: Server;
let baseURL: string;
let ordner: string;

test.beforeEach(async () => {
  ordner = await mkdtemp(path.join(os.tmpdir(), "lagekit-update-"));
  await cp(path.resolve(import.meta.dirname, "../out"), ordner, { recursive: true });
  server = await serveOut({ root: ordner, port: 0 });
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterEach(async () => {
  await stoppeServer(server);
  await rm(ordner, { recursive: true, force: true });
});

const NEUE_VERSION = {
  version: "99.0.0",
  commit: "neu1234",
  schemaVersion: 99,
  migrationen: [{ version: 99, beschreibung: "Testumbau: Tagebucheinträge bekommen ein Feld für Fotos." }],
  changelog: [
    { version: null, datum: null, einleitung: null, gruppen: [] },
    {
      version: "99.0.0",
      datum: "2026-12-01",
      einleitung: null,
      gruppen: [
        { titel: "Neu", punkte: ["Fotos im Einsatztagebuch"] },
        { titel: "Daten", punkte: ["Die Aufteilung des Arbeitsbereichs wird zurückgesetzt."] },
      ],
    },
  ],
};

async function neuenWorkerAusliefern() {
  const datei = path.join(ordner, "sw.js");
  const alt = await readFile(datei, "utf8");
  // Antwortet vor dem eigentlichen Hörer auf die Versionsabfrage.
  const vorspann = `self.addEventListener("message",(e)=>{if(e.data&&e.data.type==="VERSION_INFO"){e.ports[0].postMessage(${JSON.stringify(NEUE_VERSION)});e.stopImmediatePropagation();}});\n`;
  await writeFile(datei, vorspann + alt);
}

test("zeigt vor dem Update Änderungen und Datenumbau, aktualisiert erst nach Klick", async ({ page }) => {
  await page.goto(`${baseURL}/`);
  await expect(page.getByTestId("offline-status")).toHaveAttribute("data-status", "bereit");
  await expect(page.getByTestId("update-hinweis")).toHaveCount(0);

  await neuenWorkerAusliefern();
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());

  const hinweis = page.getByTestId("update-hinweis");
  await expect(hinweis).toContainText("Neue Version 99.0.0 bereit.");
  await expect(hinweis).toContainText("Umstellung gespeicherter Daten");
  // Zusätzlich eine Benachrichtigung, einmal je Version.
  await expect(page.getByTestId("toast")).toContainText("Neue Version 99.0.0 verfügbar");
  await expect(page.getByTestId("toast")).toContainText("Gespeicherte Daten werden beim Update umgebaut");

  await page.getByTestId("update-hinweis-link").click();
  await expect(page.getByRole("heading", { level: 1, name: "Änderungen" })).toBeVisible();
  const pruefung = page.getByTestId("update-pruefung");
  await expect(pruefung.getByText("Neue Version 99.0.0 bereit")).toBeVisible();
  await expect(pruefung).toContainText("Fotos im Einsatztagebuch");
  const daten = page.getByTestId("update-daten");
  await expect(daten).toHaveAttribute("data-umbau", "ja");
  await expect(daten).toContainText("Testumbau: Tagebucheinträge bekommen ein Feld für Fotos.");
  await expect(daten).toContainText("Die Aufteilung des Arbeitsbereichs wird zurückgesetzt.");
  // Auf der Änderungsseite selbst kein doppelter Hinweis.
  await expect(page.getByTestId("update-hinweis")).toHaveCount(0);

  // Sicherung vor dem Update.
  const download = page.waitForEvent("download");
  await page.getByTestId("update-sichern").click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);

  // Erst der Klick aktiviert die neue Version; die Seite lädt neu.
  const neuGeladen = page.waitForEvent("load");
  await page.getByTestId("update-aktivieren").click();
  await neuGeladen;
  await expect(page.getByRole("heading", { level: 1, name: "Änderungen" })).toBeVisible();
  await expect(page.getByTestId("update-pruefung")).toHaveCount(0);
  await expect(page.getByTestId("aenderungen-version")).toContainText("Installiert");
});

test("Seite Änderungen zeigt die installierte Version und den Verlauf", async ({ page }) => {
  await page.goto(`${baseURL}/aenderungen/`);
  await expect(page.getByRole("heading", { level: 1, name: "Änderungen" })).toBeVisible();
  const version = JSON.parse(await readFile(path.resolve(import.meta.dirname, "../package.json"), "utf8")).version;
  await expect(page.getByRole("heading", { name: `Version ${version}` })).toBeVisible();
  await expect(page.getByTestId("update-pruefung")).toHaveCount(0);
});
