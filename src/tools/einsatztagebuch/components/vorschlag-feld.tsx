"use client";

import { useState, type ComponentProps } from "react";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete";
import { Input } from "@/components/ui/input";
import { ergaenzungFinden, vorschlaegeFiltern } from "../logic";

type Props = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  id: string;
  value: string;
  onChange: (wert: string) => void;
  /** Bereits genutzte Werte, wichtigste zuerst. */
  vorschlaege: string[];
};

/**
 * Textfeld mit Vorschlägen aus bereits genutzten Werten (shadcn-Autocomplete).
 * Beim Tippen erscheint die wahrscheinlichste Ergänzung grau im Feld; Tab (oder → am
 * Ende) übernimmt sie. Darunter steht eine Liste: ↑↓ wählen, Tab oder Enter übernimmt,
 * Esc schließt, antippen übernimmt. Ohne Vorschlag bleibt Tab der normale Feldwechsel
 * und Enter speichert wie gewohnt.
 */
export function VorschlagFeld({ id, value, onChange, vorschlaege, className, onBlur, onFocus, onKeyDown, ...rest }: Props) {
  const [fokus, setFokus] = useState(false);
  const [offen, setOffen] = useState(false);
  const [markiert, setMarkiert] = useState<string | undefined>();

  const treffer = vorschlaegeFiltern(vorschlaege, value);
  const listeOffen = offen && treffer.length > 0;
  const ergaenzung = fokus ? ergaenzungFinden(vorschlaege, value) : null;

  function uebernehmen(wert: string) {
    onChange(wert);
    setOffen(false);
    setMarkiert(undefined);
  }

  return (
    <Autocomplete
      items={treffer}
      // Die Reihenfolge (aktueller Einsatz zuerst) kommt aus vorschlaegeFiltern.
      filter={null}
      value={value}
      onValueChange={(wert) => onChange(wert)}
      open={listeOffen}
      onOpenChange={(auf) => {
        setOffen(auf);
        if (!auf) setMarkiert(undefined);
      }}
      onItemHighlighted={(wert, details) => setMarkiert(details.reason === "keyboard" ? (wert as string | undefined) : undefined)}
      openOnInputClick
    >
      <div className="relative">
        <AutocompleteInput
          id={id}
          aria-autocomplete="both"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={(e) => {
            setFokus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFokus(false);
            onBlur?.(e);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            const ohneZusatz = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
            if (event.key === "Tab" && ohneZusatz) {
              const gewaehlt = listeOffen && markiert ? markiert : ergaenzung;
              if (gewaehlt) {
                event.preventDefault();
                event.preventBaseUIHandler();
                uebernehmen(gewaehlt);
              }
            } else if (event.key === "ArrowRight" && ohneZusatz && ergaenzung) {
              const feld = event.currentTarget;
              if (feld.selectionStart === value.length && feld.selectionEnd === value.length) {
                event.preventDefault();
                uebernehmen(ergaenzung);
              }
            } else if (event.key === "Escape" && listeOffen) {
              // Nur die Liste schließen; die Schnellerfassung leert sonst bei Esc den Inhalt.
              event.preventDefault();
              event.stopPropagation();
              event.preventBaseUIHandler();
              setOffen(false);
              setMarkiert(undefined);
            }
          }}
          render={<Input {...rest} autoComplete="off" className={className} />}
        />
        {ergaenzung && (
          <div
            aria-hidden
            data-testid={`${id}-ergaenzung`}
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden border border-transparent px-3 text-base whitespace-pre"
          >
            <span className="invisible">{value}</span>
            <span className="text-muted-foreground">{ergaenzung.slice(value.length)}</span>
          </div>
        )}
      </div>
      <AutocompleteContent>
        <AutocompleteList aria-label="Vorschläge">
          {(t: string) => (
            <AutocompleteItem key={t} value={t}>
              {t}
            </AutocompleteItem>
          )}
        </AutocompleteList>
        <div className="border-t px-3 py-1.5 text-xs text-muted-foreground [@media(pointer:coarse)]:hidden" aria-hidden>
          Tab übernimmt · ↑↓ wählen · Esc schließt
        </div>
      </AutocompleteContent>
    </Autocomplete>
  );
}
