"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useState } from "react";
import { useSitzung } from "../hooks";
import { SitzungGast } from "./sitzung-gast";
import { SitzungHost } from "./sitzung-host";
import { SitzungStart } from "./sitzung-start";

export function SitzungSeite() {
  const sitzung = useSitzung();
  const [weg, setWeg] = useState<"kurzcode" | "qr">("kurzcode");
  if (!sitzung) return <SitzungStart onWeg={setWeg} />;
  if (sitzung.rolle === "host") return <SitzungHost sitzung={sitzung} />;
  return <SitzungGast sitzung={sitzung} perQr={weg === "qr"} />;
}
