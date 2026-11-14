import { csvErstellen } from "@/core/export/csv";
import type { Einsatz } from "@/core/einsatz/schema";
import { dateinamenTeil } from "@/core/export/json";
import { aufenthaltDosis, odlInMsvProStunde } from "./logic";
import type { Aufenthalt, Person, Richtwert } from "./schema";

/** Gesamtübersicht als CSV: eine Zeile je Aufenthalt, mit Rechenweg-Werten. */
export function dosisCsv(
  personen: Person[],
  aufenthalte: Aufenthalt[],
  richtwerte: Richtwert[],
  jetzt: Date,
): string {
  const personNach = new Map(personen.map((p) => [p.id, p]));
  const richtwertNach = new Map(richtwerte.map((r) => [r.id, r]));
  const zeilen = aufenthalte
    .map((a) => ({ a, p: personNach.get(a.personId), b: aufenthaltDosis(a, jetzt) }))
    .filter((z) => z.p)
    .sort((x, y) => x.p!.name.localeCompare(y.p!.name, "de") || x.a.beginn.localeCompare(y.a.beginn));

  return csvErstellen(zeilen, [
    { titel: "Name", wert: (z) => z.p!.name },
    { titel: "Trupp", wert: (z) => z.p!.trupp },
    { titel: "Richtwert (mSv)", wert: (z) => richtwertNach.get(z.p!.richtwertId)?.grenzeMsv },
    { titel: "Ort", wert: (z) => z.a.ort },
    { titel: "Beginn", wert: (z) => z.a.beginn },
    { titel: "Ende", wert: (z) => z.a.ende ?? "läuft" },
    { titel: "Dauer (h)", wert: (z) => Number(z.b.dauerH.toFixed(4)) },
    { titel: "ODL", wert: (z) => z.a.odl },
    { titel: "ODL-Einheit", wert: (z) => z.a.odlEinheit },
    { titel: "ODL (mSv/h)", wert: (z) => odlInMsvProStunde(z.a.odl, z.a.odlEinheit) },
    { titel: "Dosis berechnet (mSv)", wert: (z) => Number(z.b.dosisMsv.toFixed(6)) },
    { titel: "Dosimeter abgelesen (mSv)", wert: (z) => z.a.dosimeterMsv },
  ]);
}

export function dosisCsvDateiname(einsatz: Einsatz, jetzt: Date = new Date()): string {
  return `lagekit-${jetzt.toISOString().slice(0, 10)}-${dateinamenTeil(einsatz.stichwort)}-dosis.csv`;
}
