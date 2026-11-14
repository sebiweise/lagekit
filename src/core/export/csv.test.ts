import { describe, expect, it } from "vitest";
import { csvErstellen } from "./csv";

describe("csvErstellen", () => {
  it("nutzt Semikolon, BOM, deutsches Dezimalkomma und maskiert Sonderzeichen", () => {
    const csv = csvErstellen(
      [
        { name: 'Müller; "Hans"', dosis: 0.125 },
        { name: "=SUMME(A1)", dosis: null },
      ],
      [
        { titel: "Name", wert: (z) => z.name },
        { titel: "Dosis (mSv)", wert: (z) => z.dosis },
      ],
    );
    expect(csv).toBe(
      '﻿Name;Dosis (mSv)\r\n"Müller; ""Hans""";0,125\r\n\'=SUMME(A1);\r\n',
    );
  });
});
