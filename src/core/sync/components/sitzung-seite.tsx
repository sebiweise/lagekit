"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useSitzung } from "../hooks";
import { SitzungGast } from "./sitzung-gast";
import { SitzungHost } from "./sitzung-host";
import { SitzungStart } from "./sitzung-start";

export function SitzungSeite() {
  const sitzung = useSitzung();
  if (!sitzung) return <SitzungStart />;
  if (sitzung.rolle === "host") return <SitzungHost sitzung={sitzung} />;
  return <SitzungGast sitzung={sitzung} />;
}
