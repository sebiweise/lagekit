import { describe, expect, it } from "vitest";
import { zahlLesen } from "./zahl";

describe("zahlLesen", () => {
  it("akzeptiert Komma und Punkt", () => {
    expect(zahlLesen("0,25")).toBe(0.25);
    expect(zahlLesen(" 12.5 ")).toBe(12.5);
    expect(zahlLesen("")).toBeNull();
    expect(zahlLesen("abc")).toBeNull();
  });
});
