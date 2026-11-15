"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSitzung } from "../hooks";
import { sitzungen } from "../sitzung";
import { SitzungGast } from "./sitzung-gast";
import { SitzungHost } from "./sitzung-host";
import { SitzungStart } from "./sitzung-start";

export function SitzungSeite() {
  const sitzung = useSitzung();
  if (!sitzung && sitzungen.andererTab()) {
    return (
      <Card data-testid="sitzung-anderer-tab-seite">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden /> Sitzung läuft in einem anderen Tab
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Auf diesem Gerät führt ein anderer Tab die Sitzung. Hier kannst du ganz normal weiterarbeiten: Alles, was du
            in diesem Tab einträgst, wird über den anderen Tab mit allen Geräten abgeglichen, und Änderungen der anderen
            Geräte erscheinen auch hier.
          </p>
          <p className="text-muted-foreground">
            Teilnehmer, Freigaben und Kurzcode steuerst du im anderen Tab. Wird er geschlossen, übernimmt dieser Tab die
            Sitzung automatisch.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!sitzung) return <SitzungStart />;
  if (sitzung.rolle === "host") return <SitzungHost sitzung={sitzung} />;
  return <SitzungGast sitzung={sitzung} />;
}
