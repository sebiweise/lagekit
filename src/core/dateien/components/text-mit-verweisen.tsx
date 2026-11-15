"use client";

import { Paperclip } from "lucide-react";
import { verweiseZerlegen } from "../verweis";
import { dateiZeigen } from "./datei-vorschau";

/** Text, in dem Dateiverweise `[[Ordner/Pfad]]` als antippbare Links erscheinen. */
export function TextMitVerweisen({ text, einsatzId }: { text: string; einsatzId: string }) {
  const teile = verweiseZerlegen(text);
  const verweise = teile.flatMap((t) => (t.art === "verweis" ? [{ ordner: t.ordner, pfad: t.pfad }] : []));
  let nr = 0;
  return (
    <>
      {teile.map((t, i) => {
        if (t.art === "text") return <span key={i}>{t.text}</span>;
        const index = nr++;
        return (
          <button
            key={i}
            type="button"
            data-testid="datei-verweis"
            title={`${t.ordner}/${t.pfad} öffnen`}
            className="mx-0.5 inline-flex items-baseline gap-1 rounded bg-primary/10 px-1.5 text-primary underline-offset-4 hover:underline [text-decoration:inherit]"
            onClick={() => dateiZeigen(einsatzId, verweise, index)}
          >
            <Paperclip className="size-4 self-center" aria-hidden />
            {t.pfad.split("/").pop()}
          </button>
        );
      })}
    </>
  );
}
