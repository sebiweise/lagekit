"use client";

import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getDb } from "@/core/db/db";
import { personAnlegen } from "../repository";
import { STANDARD_RICHTWERT_ID } from "../richtwerte";
import type { Richtwert } from "../schema";

export function PersonFormular({
  einsatzId,
  richtwerte,
  trupps,
}: {
  einsatzId: string;
  richtwerte: Richtwert[];
  trupps: string[];
}) {
  const [name, setName] = useState("");
  const [trupp, setTrupp] = useState("");
  const [richtwertId, setRichtwertId] = useState(STANDARD_RICHTWERT_ID);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(event: FormEvent) {
    event.preventDefault();
    setFehler(null);
    // Feld sofort leeren, damit schon die nächste Person getippt werden kann, während gespeichert wird.
    const eingabe = { einsatzId, name, trupp, richtwertId };
    setName("");
    document.getElementById("person-name")?.focus();
    try {
      await personAnlegen(getDb(), eingabe);
    } catch (e) {
      setName((aktuell) => aktuell || eingabe.name);
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={absenden} className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1.5fr_2fr_auto] sm:items-end" aria-label="Person anlegen">
      <div className="flex flex-col gap-2">
        <Label htmlFor="person-name">Name *</Label>
        <Input id="person-name" required autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="person-trupp">Trupp</Label>
        <Input
          id="person-trupp"
          autoComplete="off"
          list="trupp-vorschlaege"
          placeholder="z. B. AT 1"
          value={trupp}
          onChange={(e) => setTrupp(e.target.value)}
        />
        <datalist id="trupp-vorschlaege">
          {trupps.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="person-richtwert">Richtwert</Label>
        <Select id="person-richtwert" value={richtwertId} onChange={(e) => setRichtwertId(e.target.value)}>
          {richtwerte.map((r) => (
            <option key={r.id} value={r.id}>
              {r.bezeichnung} ({r.grenzeMsv} mSv)
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit">
        <UserPlus /> Person anlegen
      </Button>
      {fehler && (
        <p role="alert" className="text-sm text-destructive sm:col-span-4">
          {fehler}
        </p>
      )}
    </form>
  );
}
