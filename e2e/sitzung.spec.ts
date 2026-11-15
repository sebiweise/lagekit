import type { Server } from "node:http";
import { expect, test, type BrowserContext } from "@playwright/test";
import { speicherImArbeitsspeicher, vermitteln } from "../src/core/sync/vermittlung-dienst";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

/** Alle Wege zu einem Vermittlungsdienst, auch zum gehosteten (Standard im Build). */
const DIENST = "**/api/vermittlung/";
const CORS = { "access-control-allow-origin": "*" };

/** Vermittlungsdienst im Testprozess statt der Vercel-Funktion; der echte Dienst wird nie angesprochen. */
async function dienstImTest(kontext: BrowserContext, speicher: ReturnType<typeof speicherImArbeitsspeicher>, ip: string) {
  await kontext.route(DIENST, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { ...CORS, "access-control-allow-headers": "content-type" } });
      return;
    }
    const { status, inhalt } = await vermitteln(speicher, route.request().postDataJSON(), ip);
    await route.fulfill({ status, json: inhalt, headers: CORS });
  });
}

/** Kein Dienst erreichbar (wie ohne Internet). */
async function ohneDienst(kontext: BrowserContext) {
  await kontext.route(DIENST, (route) => route.abort("internetdisconnected"));
}

test("Gemeinsam arbeiten offline: Beitritt per Code, Freigabe durch den Host, Abgleich in beide Richtungen", async ({
  browser,
}) => {
  // Host: Einsatz anlegen und Sitzung starten. Der Kurzcode-Dienst ist nicht erreichbar.
  const hostKontext = await browser.newContext();
  await ohneDienst(hostKontext);
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
  await gast.getByRole("button", { name: "Offline mit QR-Code" }).click();
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
  // Benachrichtigung beim Host: Gerät verbunden.
  await expect(host.getByTestId("toast").filter({ hasText: "Gerät verbunden" })).toContainText("Schmidt");

  // Navigation innerhalb der App (ein volles Neuladen würde die Sitzung beenden).
  async function tagebuch(seite: typeof host) {
    await seite.getByRole("link", { name: "Start", exact: true }).click();
    await seite.getByRole("main").getByRole("link", { name: /Einsatztagebuch/ }).click();
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
  // Benachrichtigung nur beim anderen Gerät, nicht beim Verfasser.
  await expect(host.getByTestId("toast").filter({ hasText: "Messtrupp 1 an Messpunkt 3" })).toContainText(
    "Tagebuch Nr. 1",
  );
  await expect(gast.getByTestId("toast").filter({ hasText: "Messtrupp 1" })).toHaveCount(0);
  await host.getByLabel("Inhalt").fill("Lagemeldung an Leitstelle");
  await host.getByLabel("Inhalt").press("Enter");
  await expect(gast.getByTestId("tagebuch-eintrag").filter({ hasText: "Lagemeldung an Leitstelle" })).toBeVisible();
  await expect(gast.getByTestId("tagebuch-eintrag")).toHaveCount(2);

  // Ein zweiter Tab auf dem Host arbeitet mit: Seine Einträge erreichen den Gast.
  const hostTab2 = await hostKontext.newPage();
  await hostTab2.goto(`${baseURL}/tools/einsatztagebuch/`);
  await expect(hostTab2.getByTestId("sitzung-anderer-tab")).toBeVisible();
  await hostTab2.getByLabel("Inhalt").fill("Aus dem zweiten Tab des Hosts");
  await hostTab2.getByLabel("Inhalt").press("Enter");
  await expect(gast.getByTestId("tagebuch-eintrag").filter({ hasText: "Aus dem zweiten Tab des Hosts" })).toBeVisible();
  await expect(gast.getByTestId("toast").filter({ hasText: "Aus dem zweiten Tab des Hosts" })).toBeVisible();
  // Eigene Einträge aus einem anderen Tab desselben Geräts lösen beim Host keine Meldung aus.
  await expect(host.getByTestId("tagebuch-eintrag").filter({ hasText: "Aus dem zweiten Tab des Hosts" })).toBeVisible();
  await host.waitForTimeout(800);
  await expect(host.getByTestId("toast").filter({ hasText: "Aus dem zweiten Tab" })).toHaveCount(0);
  // Verlauf an der Glocke.
  await gast.getByTestId("glocke").click();
  await expect(gast.getByTestId("glocke-verlauf")).toContainText("Aus dem zweiten Tab des Hosts");
  await gast.keyboard.press("Escape");
  await expect(gast.getByTestId("glocke-zahl")).toHaveCount(0);
  await hostTab2.close();

  // Host trennt das Gerät.
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.locator('[data-gast="Schmidt"]').getByRole("button", { name: "Trennen" }).click();
  await expect(gast.getByTestId("sitzung-status")).toContainText("Der Host hat die Verbindung getrennt.");

  await hostKontext.close();
  await gastKontext.close();
});

test("Host kann eine Beitrittsanfrage ablehnen", async ({ browser }) => {
  const hostKontext = await browser.newContext();
  await ohneDienst(hostKontext);
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
  await gast.getByRole("button", { name: "Offline mit QR-Code" }).click();
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
  const speicher = speicherImArbeitsspeicher();
  const dienst = (kontext: BrowserContext, ip: string) => dienstImTest(kontext, speicher, ip);

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

  // Ein zweiter Tab auf dem Gast übernimmt die Sitzung nicht, arbeitet aber mit:
  // Seine Einträge gehen über den ersten Tab an den Host, Einträge des Hosts erscheinen auch hier.
  const zweiterTab = await gastKontext.newPage();
  await zweiterTab.goto(`${baseURL}/tools/einsatztagebuch/`);
  await expect(zweiterTab.getByTestId("sitzung-anderer-tab")).toBeVisible();
  await zweiterTab.getByLabel("Inhalt").fill("Aus dem zweiten Tab");
  await zweiterTab.getByLabel("Inhalt").press("Enter");
  await host.getByRole("main").getByRole("link", { name: /Einsatztagebuch/ }).click();
  await expect(host.getByTestId("tagebuch-eintrag").filter({ hasText: "Aus dem zweiten Tab" })).toBeVisible();
  await host.getByLabel("Inhalt").fill("Vom Host an alle Tabs");
  await host.getByLabel("Inhalt").press("Enter");
  await expect(zweiterTab.getByTestId("tagebuch-eintrag").filter({ hasText: "Vom Host an alle Tabs" })).toBeVisible();
  await zweiterTab.close();
  await expect(gast.getByTestId("sitzung-status")).toContainText("Verbunden mit Müller");
  await expect(host.getByTestId("sitzung-status")).toContainText("1 Gerät verbunden");

  // Löscht der Gast seine Kopie, verlässt er die Sitzung; beim Host bleibt der Einsatz erhalten.
  await gast.getByRole("link", { name: "Einsatz", exact: true }).click();
  const eintrag = gast.getByTestId("einsatz-eintrag").filter({ hasText: "Hochwasser" });
  await eintrag.getByRole("button", { name: "Löschen" }).click();
  await gast.getByRole("alertdialog").getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(gast.getByTestId("einsatz-eintrag")).toHaveCount(0);
  await expect(host.getByTestId("sitzung-status")).toContainText("0 Geräte verbunden", { timeout: 15_000 });
  await host.getByRole("link", { name: "Einsatz", exact: true }).click();
  await expect(host.getByTestId("einsatz-eintrag").filter({ hasText: "Hochwasser" })).toBeVisible();

  await hostKontext.close();
  await gastKontext.close();
});

test("Sitzung übersteht Neuladen: Gast verbindet sich selbst neu, Änderungen aus der Trennung kommen nach", async ({
  browser,
}) => {
  const speicher = speicherImArbeitsspeicher();
  const dienst = (kontext: BrowserContext, ip: string) => dienstImTest(kontext, speicher, ip);

  const hostKontext = await browser.newContext();
  await dienst(hostKontext, "1");
  const host = await hostKontext.newPage();
  await host.goto(`${baseURL}/einsatz/`);
  await host.locator("#einsatz-stichwort").fill("Sturm");
  await host.getByRole("button", { name: "Einsatz anlegen" }).click();
  await host.getByRole("link", { name: "Gemeinsam" }).click();
  await host.getByLabel("Name *").fill("Müller");
  await host.getByRole("button", { name: "Sitzung starten" }).click();
  const kurzcode = (await host.getByTestId("kurzcode").innerText()).replace(/\s/g, "");

  const gastKontext = await browser.newContext();
  await dienst(gastKontext, "2");
  const gast = await gastKontext.newPage();
  await gast.goto(`${baseURL}/sitzung/`);
  await gast.getByLabel("Name *").fill("Schmidt");
  await gast.getByLabel("Kurzcode vom Host").fill(kurzcode);
  await gast.getByRole("button", { name: "Beitreten" }).click();
  await host.locator('[data-gast="Schmidt"]').getByRole("button", { name: "Zulassen" }).click();
  await expect(gast.getByText("Verbunden: Sturm")).toBeVisible({ timeout: 15_000 });

  // Gast lädt die Seite neu: verbindet sich ohne erneute Freigabe wieder.
  await gast.reload();
  await expect(gast.getByText("Verbunden: Sturm")).toBeVisible({ timeout: 15_000 });
  await expect(host.locator('[data-gast="Schmidt"]')).toContainText("wieder aufgenommen");

  // Beide öffnen das Tagebuch.
  async function tagebuch(seite: typeof host) {
    await seite.getByRole("link", { name: "Start", exact: true }).click();
    await seite.getByRole("main").getByRole("link", { name: /Einsatztagebuch/ }).click();
    await expect(seite.getByLabel("Inhalt")).toBeVisible();
  }
  await tagebuch(gast);

  // Host fällt aus (Neuladen). Gast schreibt in der Zwischenzeit weiter.
  await host.close();
  await expect(gast.getByTestId("sitzung-status")).toContainText("Verbindung zum Host verloren", { timeout: 20_000 });
  await gast.getByLabel("Inhalt").fill("Eintrag während der Trennung");
  await gast.getByLabel("Inhalt").press("Enter");

  // Host ist wieder da und schreibt selbst einen Eintrag mit derselben Nummer.
  const host2 = await hostKontext.newPage();
  await host2.goto(`${baseURL}/`);
  await expect(host2.getByTestId("sitzung-status")).toContainText("Kurzcode");
  await tagebuch(host2);
  await host2.getByLabel("Inhalt").fill("Eintrag des Hosts");
  await host2.getByLabel("Inhalt").press("Enter");

  // Gast verbindet sich selbst neu; sein Eintrag kommt nach und bekommt eine eigene Nummer.
  await expect(gast.getByTestId("sitzung-status")).toContainText("Verbunden mit Müller", { timeout: 30_000 });
  const eintraegeHost = host2.getByTestId("tagebuch-eintrag");
  await expect(eintraegeHost).toHaveCount(2);
  await expect(eintraegeHost.filter({ hasText: "Eintrag während der Trennung" })).toContainText("2");
  await expect(gast.getByTestId("tagebuch-eintrag")).toHaveCount(2);

  await hostKontext.close();
  await gastKontext.close();
});

test("Kurzcode zur Laufzeit ausgeschaltet (Docker): nur QR-Weg, Hinweise nennen es", async ({ browser }) => {
  const kontext = await browser.newContext();
  let aufgerufen = false;
  await kontext.route(DIENST, (route) => {
    aufgerufen = true;
    return route.abort();
  });
  // So liefert das Docker-Image die Einstellung mit LAGEKIT_KURZCODE_DIENST=false aus.
  await kontext.route("**/konfiguration.json", (route) => route.fulfill({ json: { kurzcodeDienst: "false" } }));
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/einsatz/`);
  await seite.locator("#einsatz-stichwort").fill("Brand");
  await seite.getByRole("button", { name: "Einsatz anlegen" }).click();
  await seite.goto(`${baseURL}/sitzung/`);
  await expect(seite.getByTestId("kurzcode-aus")).toBeVisible();
  await expect(seite.getByRole("button", { name: "Mit Kurzcode" })).toHaveCount(0);
  await expect(seite.getByLabel("Kurzcode vom Host")).toHaveCount(0);

  await seite.getByLabel("Name *").fill("Müller");
  await seite.getByRole("button", { name: "Sitzung starten" }).click();
  await expect(seite.getByTestId("kurzcode-aus")).toContainText("ausgeschaltet");
  await expect(seite.getByText("Kurzcode wird angefordert")).toHaveCount(0);

  await seite.goto(`${baseURL}/hinweise/`);
  await expect(seite.getByTestId("dienst-anzeige")).toContainText("ausgeschaltet");
  expect(aufgerufen).toBe(false);
  await kontext.close();
});

test("Gehosteter Dienst als Standard: Datenschutzhinweis nennt die Adresse", async ({ browser }) => {
  const kontext = await browser.newContext();
  await dienstImTest(kontext, speicherImArbeitsspeicher(), "1");
  const seite = await kontext.newPage();
  await seite.goto(`${baseURL}/sitzung/`);
  await expect(seite.getByTestId("dienst-hinweis")).toContainText("lagekit.vercel.app");
  await seite.goto(`${baseURL}/hinweise/`);
  await expect(seite.getByTestId("dienst-anzeige")).toContainText("lagekit.vercel.app");
  await expect(seite.getByRole("link", { name: /Fehler melden/ })).toHaveAttribute(
    "href",
    "https://github.com/sebiweise/lagekit/issues/new/choose",
  );
  await kontext.close();
});
