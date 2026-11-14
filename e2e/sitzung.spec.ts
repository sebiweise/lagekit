import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { speicherImArbeitsspeicher, vermitteln } from "../src/core/sync/vermittlung-dienst";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

test("Gemeinsam arbeiten offline: Beitritt per Code, Freigabe durch den Host, Abgleich in beide Richtungen", async ({
  browser,
}) => {
  // Host: Einsatz anlegen und Sitzung starten. Der Kurzcode-Dienst fehlt hier (statischer Server).
  const hostKontext = await browser.newContext();
  const host = await hostKontext.newPage();
  await host.goto(`${baseURL}/einsatz/`);
  await host.locator("#einsatz-stichwort").fill("ABC 2");
  await host.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(host.getByTestId("kopf-einsatz")).toHaveText("ABC 2");
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.getByLabel("Name *").fill("Müller");
  await host.getByLabel("Funktion").fill("Einsatzleiter");
  await host.getByRole("button", { name: "Sitzung starten" }).click();
  await expect(host.getByText(/Kein Kurzcode/)).toBeVisible();

  // Gast: anderes Gerät, Beitritt offline.
  const gastKontext = await browser.newContext();
  const gast = await gastKontext.newPage();
  await gast.goto(`${baseURL}/sitzung/`);
  await gast.getByLabel("Name *").fill("Schmidt");
  await gast.getByLabel("Funktion").fill("Führungsassistent");
  await gast.getByLabel("Fahrzeug").fill("ELW 1");
  await gast.getByRole("radio", { name: "Offline mit QR-Code" }).click();
  await gast.getByRole("button", { name: "Beitreten" }).click();
  const beitrittscode = await gast.getByTestId("beitrittscode").inputValue();
  expect(beitrittscode).toMatch(/^LKA1\./);

  // Host prüft die Anfrage: sieht Name, Funktion, Fahrzeug und Gerät.
  await host.getByRole("textbox", { name: "Beitrittscode des Geräts" }).fill(beitrittscode);
  await host.getByRole("button", { name: "Anfrage prüfen" }).click();
  const karte = host.locator('[data-gast="Schmidt"]');
  await expect(karte).toContainText("Führungsassistent · ELW 1");
  await expect(karte).toContainText("wartet auf Freigabe");
  await karte.getByRole("button", { name: "Zulassen" }).click();
  const antwortcode = await karte.getByTestId("antwortcode").inputValue();

  await gast.getByRole("textbox", { name: "Antwortcode des Hosts" }).fill(antwortcode);
  await gast.getByRole("button", { name: "Verbinden" }).click();
  await expect(gast.getByText("Verbunden: ABC 2")).toBeVisible({ timeout: 15_000 });
  await expect(karte).toContainText("verbunden");
  await expect(gast.getByTestId("kopf-einsatz")).toHaveText("ABC 2");

  // Navigation innerhalb der App (ein volles Neuladen würde die Sitzung beenden).
  async function tagebuch(seite: typeof host) {
    await seite.getByRole("link", { name: "Start", exact: true }).click();
    await seite.getByRole("link", { name: /Einsatztagebuch/ }).click();
    await expect(seite.getByLabel("Inhalt")).toBeVisible();
  }
  await tagebuch(gast);
  await tagebuch(host);
  await expect(host.getByTestId("sitzung-status")).toContainText("1 Gerät verbunden");
  await expect(gast.getByTestId("sitzung-status")).toContainText("Verbunden mit Müller");

  // Gast schreibt, Host sieht es; Host schreibt, Gast sieht es.
  await gast.getByLabel("Inhalt").fill("Messtrupp 1 an Messpunkt 3");
  await gast.getByLabel("Inhalt").press("Enter");
  await expect(host.getByTestId("tagebuch-eintrag").filter({ hasText: "Messtrupp 1 an Messpunkt 3" })).toBeVisible();
  await host.getByLabel("Inhalt").fill("Lagemeldung an Leitstelle");
  await host.getByLabel("Inhalt").press("Enter");
  await expect(gast.getByTestId("tagebuch-eintrag").filter({ hasText: "Lagemeldung an Leitstelle" })).toBeVisible();
  await expect(gast.getByTestId("tagebuch-eintrag")).toHaveCount(2);

  // Host trennt das Gerät.
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.locator('[data-gast="Schmidt"]').getByRole("button", { name: "Trennen" }).click();
  await expect(gast.getByTestId("sitzung-status")).toContainText("Der Host hat die Verbindung getrennt.");

  await hostKontext.close();
  await gastKontext.close();
});

test("Host kann eine Beitrittsanfrage ablehnen", async ({ browser }) => {
  const hostKontext = await browser.newContext();
  const host = await hostKontext.newPage();
  await host.goto(`${baseURL}/einsatz/`);
  await host.locator("#einsatz-stichwort").fill("ABC 3");
  await host.getByRole("button", { name: "Einsatz anlegen" }).click();
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.getByLabel("Name *").fill("Müller");
  await host.getByRole("button", { name: "Sitzung starten" }).click();

  const gast = await (await browser.newContext()).newPage();
  await gast.goto(`${baseURL}/sitzung/`);
  await gast.getByLabel("Name *").fill("Unbekannt");
  await gast.getByRole("radio", { name: "Offline mit QR-Code" }).click();
  await gast.getByRole("button", { name: "Beitreten" }).click();
  await host.getByRole("textbox", { name: "Beitrittscode des Geräts" }).fill(await gast.getByTestId("beitrittscode").inputValue());
  await host.getByRole("button", { name: "Anfrage prüfen" }).click();
  const karte = host.locator('[data-gast="Unbekannt"]');
  await karte.getByRole("button", { name: "Ablehnen" }).click();
  await expect(karte).toContainText("abgelehnt");
  await expect(karte.getByTestId("antwortcode")).toHaveCount(0);

  // Ein fremder Text wird nicht als Anfrage angenommen.
  await host.getByRole("textbox", { name: "Beitrittscode des Geräts" }).fill("hallo");
  await host.getByRole("button", { name: "Anfrage prüfen" }).click();
  await expect(host.getByText("Das ist nicht der erwartete Lagekit-Code.")).toBeVisible();
});

test("Gemeinsam arbeiten mit Kurzcode: Host sieht die Anfrage auf jeder Seite und lässt zu", async ({ browser }) => {
  // Vermittlungsdienst im Testprozess statt der Vercel-Funktion.
  const speicher = speicherImArbeitsspeicher();
  async function dienst(kontext: Awaited<ReturnType<typeof browser.newContext>>, ip: string) {
    await kontext.route("**/api/vermittlung", async (route) => {
      const { status, inhalt } = await vermitteln(speicher, route.request().postDataJSON(), ip);
      await route.fulfill({ status, json: inhalt });
    });
  }

  const hostKontext = await browser.newContext();
  await dienst(hostKontext, "1");
  const host = await hostKontext.newPage();
  await host.goto(`${baseURL}/einsatz/`);
  await host.locator("#einsatz-stichwort").fill("Hochwasser");
  await host.getByRole("button", { name: "Einsatz anlegen" }).click();
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.getByLabel("Name *").fill("Müller");
  await host.getByRole("button", { name: "Sitzung starten" }).click();
  const kurzcode = (await host.getByTestId("kurzcode").innerText()).replace(/\s/g, "");
  expect(kurzcode).toMatch(/^\d{6}$/);
  // Host arbeitet weiter auf einer anderen Seite.
  await host.getByRole("link", { name: "Start", exact: true }).click();

  const gastKontext = await browser.newContext();
  await dienst(gastKontext, "2");
  const gast = await gastKontext.newPage();
  await gast.goto(`${baseURL}/sitzung/`);
  await gast.getByLabel("Name *").fill("Schmidt");
  await gast.getByLabel("Fahrzeug").fill("ELW 2");
  await gast.getByLabel("Kurzcode vom Host").fill(`${kurzcode.slice(0, 3)} ${kurzcode.slice(3)}`);
  await gast.getByRole("button", { name: "Beitreten" }).click();
  await expect(gast.getByTestId("gast-status")).toContainText("Warte auf Freigabe");

  const hinweis = host.getByRole("alert").filter({ hasText: "Beitrittsanfrage" });
  await expect(hinweis).toContainText("Schmidt");
  await expect(hinweis).toContainText("ELW 2");
  await hinweis.getByRole("button", { name: "Zulassen" }).click();
  await expect(gast.getByText("Verbunden: Hochwasser")).toBeVisible({ timeout: 15_000 });
  await expect(host.getByTestId("sitzung-status")).toContainText("1 Gerät verbunden");

  await hostKontext.close();
  await gastKontext.close();
});
