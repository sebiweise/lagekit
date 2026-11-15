import { describe, expect, it } from "vitest";
import { aufloesen, istFarbschema } from "./farbschema";

describe("Farbschema", () => {
  it("folgt standardmäßig dem System", () => {
    expect(aufloesen("system", true)).toBe("dark");
    expect(aufloesen("system", false)).toBe("light");
  });

  it("eigene Wahl schlägt die Systemeinstellung", () => {
    expect(aufloesen("hell", true)).toBe("light");
    expect(aufloesen("dunkel", false)).toBe("dark");
  });

  it("erkennt nur gültige gespeicherte Werte", () => {
    expect(istFarbschema("dunkel")).toBe(true);
    expect(istFarbschema("dark")).toBe(false);
    expect(istFarbschema(null)).toBe(false);
  });
});
