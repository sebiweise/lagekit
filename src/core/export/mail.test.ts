import { describe, expect, it } from "vitest";
import { mailtoLink } from "./mail";

describe("mailtoLink", () => {
  it("kodiert Empfänger, Betreff und Text mit CRLF", () => {
    const link = mailtoLink({ an: "leitstelle@example.org; elw@example.org", betreff: "Lage ABC 2 & Co", text: "Zeile 1\nÜbung" });
    expect(link).toBe(
      "mailto:leitstelle@example.org,elw@example.org?subject=Lage%20ABC%202%20%26%20Co&body=Zeile%201%0D%0A%C3%9Cbung",
    );
  });

  it("geht ohne Empfänger", () => {
    expect(mailtoLink({ betreff: "x", text: "y" })).toBe("mailto:?subject=x&body=y");
  });

  it("kürzt zu lange Texte zeilenweise mit Hinweis", () => {
    const text = Array.from({ length: 200 }, (_, i) => `Eintrag ${i}: Lagemeldung mit Inhalt`).join("\n");
    const link = mailtoLink({ betreff: "Bericht", text }, 500);
    expect(link.length).toBeLessThanOrEqual(500);
    const body = decodeURIComponent(link.split("&body=")[1]);
    expect(body.startsWith("Eintrag 0:")).toBe(true);
    expect(body).toContain("gekürzt, vollständig im Anhang");
  });
});
