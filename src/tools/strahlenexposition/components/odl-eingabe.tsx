"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { OdlEinheit } from "../schema";

/** ODL-Feld mit Einheitenwahl; die Einheit steht immer ausdrücklich dabei. */
export function OdlEingabe({
  id,
  wert,
  einheit,
  onWert,
  onEinheit,
}: {
  id: string;
  wert: string;
  einheit: OdlEinheit;
  onWert: (wert: string) => void;
  onEinheit: (einheit: OdlEinheit) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Ortsdosisleistung (ODL)</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          required
          value={wert}
          onChange={(e) => onWert(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Select
          aria-label="Einheit der ODL"
          value={einheit}
          onChange={(e) => onEinheit(e.target.value as OdlEinheit)}
          className="w-28"
        >
          <option value="µSv/h">µSv/h</option>
          <option value="mSv/h">mSv/h</option>
        </Select>
      </div>
    </div>
  );
}
