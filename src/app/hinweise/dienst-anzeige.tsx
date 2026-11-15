"use client";

import { useKurzcodeDienst } from "@/core/sync/dienst-konfiguration";

/** Welcher Vermittlungsdienst in dieser Installation eingestellt ist. */
export function DienstAnzeige() {
  const dienst = useKurzcodeDienst();
  if (dienst === undefined) return null;
  return (
    <p className="text-lg leading-relaxed" data-testid="dienst-anzeige">
      {dienst === null ? (
        "In dieser Installation ist der Kurzcode ausgeschaltet; es werden keine Daten an einen Vermittlungsdienst geschickt."
      ) : dienst.fremd ? (
        <>
          Diese Installation nutzt den Vermittlungsdienst unter <strong>{dienst.host}</strong>.
        </>
      ) : (
        "Diese Installation nutzt ihren eigenen Vermittlungsdienst."
      )}
    </p>
  );
}
