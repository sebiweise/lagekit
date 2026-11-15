import type { Server } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

/** Namen im zentralen Verzeichnis eines ZIP, wie sie ein Entpackprogramm liest. */
function zipNamen(daten: Buffer): string[] {
  const ende = daten.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(ende).toBeGreaterThan(0);
  const anzahl = daten.readUInt16LE(ende + 10);
  let pos = daten.readUInt32LE(ende + 16);
  const namen: string[] = [];
  for (let i = 0; i < anzahl; i++) {
    const laenge = daten.readUInt16LE(pos + 28);
    namen.push(daten.subarray(pos + 46, pos + 46 + laenge).toString("utf8"));
    pos += 46 + laenge;
  }
  return namen;
}

async function einsatzMitEintrag(page: Page) {
  await page.goto(`${baseURL}/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("ABC 2");
  await page.getByLabel("Ort", { exact: true }).fill("Werk Nord");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("ABC 2");
  await page.goto(`${baseURL}/tools/einsatztagebuch/`);
  const inhalt = page.getByLabel("Inhalt");
  await inhalt.fill("Austritt an Tank 3 <gemeldet>");
  await inhalt.press("Enter");
  await expect(page.getByTestId("tagebuch-eintrag")).toHaveCount(1);
}

test("Export: ZIP mit Anhang, Einsatzbericht und Mail über das Mailprogramm", async ({ page }) => {
  // mailto-Links mitschreiben statt ein Mailprogramm zu starten.
  await page.addInitScript(() => {
    const klick = HTMLAnchorElement.prototype.click;
    (window as unknown as { mailtos: string[] }).mailtos = [];
    HTMLAnchorElement.prototype.click = function () {
      if (this.href.startsWith("mailto:")) (window as unknown as { mailtos: string[] }).mailtos.push(this.href);
      else klick.call(this);
    };
  });
  await einsatzMitEintrag(page);

  await page.getByRole("link", { name: "Export, Druck, Mail" }).first().click();
  await expect(page.getByTestId("export-einsatz")).toHaveText("ABC 2");

  // Datei nur für diesen Export.
  const ordner = await mkdtemp(path.join(tmpdir(), "lagekit-"));
  const foto = path.join(ordner, "drohne.jpg");
  await writeFile(foto, "JPEG");
  await page.getByTestId("zusatz-dateien").setInputFiles(foto);
  await expect(page.getByText("drohne.jpg")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByTestId("zip-export").click();
  const zip = await download;
  expect(zip.suggestedFilename()).toMatch(/^lagekit-\d{4}-\d\d-\d\d-abc-2\.zip$/);
  const zipPfad = path.join(ordner, "export.zip");
  await zip.saveAs(zipPfad);
  expect(zipNamen(await readFile(zipPfad))).toEqual([
    "LIESMICH.txt",
    "einsatzbericht.html",
    "sicherung.json",
    "einsatztagebuch.csv",
    "dateien/Anhänge/drohne.jpg",
  ]);
  await expect(page.getByText(/export\.zip|\.zip gespeichert/)).toBeVisible();

  // Mail: Bericht wird gespeichert, das Mailprogramm bekommt Betreff und Kurzbericht.
  await page.getByLabel("Empfänger").fill("leitstelle@example.org");
  const bericht = page.waitForEvent("download");
  await page.getByTestId("mail-oeffnen").click();
  expect((await bericht).suggestedFilename()).toMatch(/-bericht\.html$/);
  await expect(page.getByText("bitte in der Mail anhängen")).toBeVisible();
  const mailtos = await page.evaluate(() => (window as unknown as { mailtos: string[] }).mailtos);
  expect(mailtos).toHaveLength(1);
  const link = new URL(mailtos[0]);
  expect(link.pathname).toBe("leitstelle@example.org");
  expect(link.searchParams.get("subject")).toBe("Lagekit: ABC 2, Werk Nord");
  expect(link.searchParams.get("body")).toContain("Austritt an Tank 3 <gemeldet>");

  // Empfänger bleibt auf dem Gerät gespeichert.
  await page.reload();
  await expect(page.getByLabel("Empfänger")).toHaveValue("leitstelle@example.org");

  // Einsatzbericht zum Drucken; Eingaben erscheinen als Text, nicht als HTML.
  await page.getByRole("link", { name: "Einsatzbericht öffnen" }).click();
  const druck = page.getByTestId("einsatzbericht");
  await expect(druck).toContainText("Einsatzbericht: ABC 2");
  await expect(druck).toContainText("Austritt an Tank 3 <gemeldet>");
  await expect(druck).toContainText("Werk Nord");
});

// Verknüpfte Ordner lassen sich hier nicht Ende-zu-Ende testen: Playwright kann die
// Ordnerauswahl nicht bedienen, und ein Ersatz-Handle aus dem privaten Browser-Dateisystem
// lässt den Tab dieses Chromium beim Speichern in IndexedDB abstürzen. Die Logik
// (Durchsuchen, neue Dateien erkennen, Speichern) prüft src/core/dateien/ordner.test.ts.

test("Export: ohne Ordner-Zugriff (Safari, Firefox) nur einmalige Dateien", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  });
  await einsatzMitEintrag(page);
  await page.goto(`${baseURL}/export/`);
  await expect(page.getByTestId("ordner-nicht-moeglich")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ordner verknüpfen" })).toHaveCount(0);
  await expect(page.getByText("Dateien hinzufügen")).toBeVisible();
});
