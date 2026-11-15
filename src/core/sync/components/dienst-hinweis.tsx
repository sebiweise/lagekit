"use client";

import Link from "next/link";
import type { KurzcodeDienst } from "../dienst-konfiguration";

/** Datenschutzhinweis zum Kurzcode: wohin welche Daten gehen und wie lange. */
export function DienstHinweis({ dienst }: { dienst: KurzcodeDienst }) {
  return (
    <p className="text-sm text-muted-foreground" data-testid="dienst-hinweis">
      Der Kurzcode läuft über den Vermittlungsdienst{" "}
      {dienst.fremd ? (
        <>
          unter <strong className="font-medium text-foreground">{dienst.host}</strong>
        </>
      ) : (
        "dieser Installation"
      )}
      . Er sieht nur Ihre Angaben (Name, Funktion, Fahrzeug) und die Verbindungsdaten der Geräte, für höchstens 10
      Minuten. Einsatzdaten laufen nie darüber.{" "}
      <Link href="/hinweise/#kurzcode" className="underline underline-offset-4">
        Mehr zum Datenschutz
      </Link>
    </p>
  );
}
