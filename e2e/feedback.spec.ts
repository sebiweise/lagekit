import type { Server } from "node:http";
import { expect, test } from "@playwright/test";
import { starteServer, stoppeServer } from "./server";

let server: Server;
let baseURL: string;

test.beforeEach(async () => {
  ({ server, baseURL } = await starteServer());
});

test.afterEach(() => stoppeServer(server));

/** Endpunkt des gehosteten Feedback-Diensts (CI baut mit LAGEKIT_FEEDBACK_URL=true); im Test nie wirklich angesprochen. */
const DIENST = "https://feedback.goscinski.dev/v1/feedback/lagekit";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" };

test("Feedback: Eingabe prüfen, nur Text, Art und Diagnose senden, Fehler und Offline klar melden", async ({
  page,
  context,
}) => {
  const bodies: unknown[] = [];
  let antworten: "ok" | "limit" = "limit";
  await context.route(DIENST, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    bodies.push(route.request().postDataJSON());
    expect(route.request().headers()["accept-language"]).toBe("de");
    if (antworten === "limit") {
      return route.fulfill({
        status: 429,
        headers: CORS,
        json: { ok: false, error: "Zu viele Anfragen. Bitte in einer Minute erneut versuchen.", code: "rateLimited" },
      });
    }
    return route.fulfill({ status: 201, headers: CORS, json: { ok: true } });
  });

  // Ein Einsatz liegt vor; er darf nie im Feedback auftauchen.
  await page.goto(`${baseURL}/app/einsatz/`);
  await page.locator("#einsatz-stichwort").fill("ABC 2 Geheim");
  await page.getByRole("button", { name: "Einsatz anlegen" }).click();
  await expect(page.getByTestId("kopf-einsatz")).toHaveText("ABC 2 Geheim");

  await page.goto(`${baseURL}/app/hinweise/#feedback`);
  const formular = page.getByRole("form", { name: "Feedback" });
  await expect(page.getByTestId("feedback-datenschutz")).toContainText("Cloudflare");
  await expect(page.getByTestId("feedback-datenschutz")).toContainText("GitHub");

  // Zu kurz: Fehler am Feld, keine Anfrage.
  await page.getByLabel("Ihre Nachricht").fill("kurz");
  await formular.getByRole("button", { name: "Feedback senden" }).click();
  await expect(page.getByText("Bitte mindestens 10 Zeichen schreiben.")).toBeVisible();
  expect(bodies).toHaveLength(0);

  // Fehler des Diensts: dessen Text erscheint, die Eingabe bleibt stehen.
  await formular.getByRole("button", { name: "Wunsch" }).click();
  await page.getByLabel("Ihre Nachricht").fill("Bitte eine Spalte für die Uhrzeit im Druck.");
  await formular.getByRole("button", { name: "Feedback senden" }).click();
  await expect(formular.getByRole("alert")).toHaveText("Zu viele Anfragen. Bitte in einer Minute erneut versuchen.");
  await expect(page.getByLabel("Ihre Nachricht")).toHaveValue("Bitte eine Spalte für die Uhrzeit im Druck.");

  expect(bodies[0]).not.toHaveProperty("diagnostics");

  // Erfolg, diesmal mit angehakter Diagnose (standardmäßig aus).
  antworten = "ok";
  const diagnose = formular.getByRole("checkbox", { name: /App-Version und Plattform/ });
  await expect(diagnose).not.toBeChecked();
  await diagnose.check();
  await formular.getByRole("button", { name: "Feedback senden" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Danke" })).toBeVisible();
  expect(bodies).toHaveLength(2);
  const body = bodies[1] as Record<string, unknown>;
  expect(body).toMatchObject({ kind: "wish", message: "Bitte eine Spalte für die Uhrzeit im Druck.", source: "web", website: "" });
  expect(body).not.toHaveProperty("email");
  expect(Object.keys(body.diagnostics as object).sort()).toEqual(["appVersion", "platform"]);
  expect(JSON.stringify(body)).not.toContain("ABC 2");

  // Offline: klare Meldung, Senden gesperrt, keine Anfrage.
  await page.getByRole("button", { name: "Weiteres Feedback schreiben" }).click();
  await context.setOffline(true);
  await expect(page.getByTestId("feedback-offline")).toBeVisible();
  await expect(formular.getByRole("button", { name: "Feedback senden" })).toBeDisabled();
  await context.setOffline(false);
  expect(bodies).toHaveLength(2);
});
