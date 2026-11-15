"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { useAktiverEinsatz } from "../hooks";
import { EinsatzFormular } from "./einsatz-formular";

/**
 * Formular für einen neuen Einsatz. Läuft schon ein Einsatz, bleibt es hinter
 * einem Knopf, damit die Seite mit dem laufenden Einsatz beginnt.
 */
export function NeuerEinsatz() {
  const aktiver = useAktiverEinsatz();
  if (aktiver === undefined) return null;
  return <NeuerEinsatzInhalt anfangsOffen={aktiver === null} />;
}

function NeuerEinsatzInhalt({ anfangsOffen }: { anfangsOffen: boolean }) {
  const [offen, setOffen] = useState(anfangsOffen);

  if (!offen) {
    return (
      <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setOffen(true)}>
        <Plus /> {t.einsatz.neu}
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t.einsatz.neu}</CardTitle>
        {!anfangsOffen && (
          <Button variant="ghost" size="icon" aria-label="Formular schließen" onClick={() => setOffen(false)}>
            <X />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <EinsatzFormular />
      </CardContent>
    </Card>
  );
}
