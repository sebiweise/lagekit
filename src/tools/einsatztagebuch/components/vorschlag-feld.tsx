"use client";

import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ergaenzungFinden, vorschlaegeFiltern } from "../logic";

type Props = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  id: string;
  value: string;
  onChange: (wert: string) => void;
  /** Bereits genutzte Werte, wichtigste zuerst. */
  vorschlaege: string[];
};

/**
 * Textfeld mit Vorschlägen aus bereits genutzten Werten.
 * Beim Tippen erscheint die wahrscheinlichste Ergänzung grau im Feld; Tab (oder → am
 * Ende) übernimmt sie. Darunter steht eine Liste: ↑↓ wählen, Tab oder Enter übernimmt,
 * Esc schließt, antippen übernimmt. Ohne Vorschlag bleibt Tab der normale Feldwechsel
 * und Enter speichert wie gewohnt.
 */
export function VorschlagFeld({ id, value, onChange, vorschlaege, className, onBlur, onFocus, onKeyDown, ...rest }: Props) {
  const [fokus, setFokus] = useState(false);
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);

  const treffer = fokus && offen ? vorschlaegeFiltern(vorschlaege, value) : [];
  const listeOffen = treffer.length > 0;
  const ergaenzung = fokus ? ergaenzungFinden(vorschlaege, value) : null;
  const listeId = `${id}-vorschlaege`;

  function uebernehmen(wert: string) {
    onChange(wert);
    setOffen(false);
    setAktiv(-1);
  }

  function tasten(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const ohneZusatz = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!listeOffen) {
        setOffen(true);
        setAktiv(event.key === "ArrowDown" ? 0 : -1);
        return;
      }
      // Reihum durch die Vorschläge und zurück zur eigenen Eingabe (-1).
      const schritt = event.key === "ArrowDown" ? 1 : -1;
      const stellen = treffer.length + 1;
      setAktiv(((aktiv + 1 + schritt + stellen) % stellen) - 1);
    } else if (event.key === "Tab" && ohneZusatz) {
      const gewaehlt = listeOffen && aktiv >= 0 ? treffer[aktiv] : ergaenzung;
      if (gewaehlt) {
        event.preventDefault();
        uebernehmen(gewaehlt);
      }
    } else if (event.key === "Enter" && listeOffen && aktiv >= 0) {
      event.preventDefault();
      uebernehmen(treffer[aktiv]);
    } else if (event.key === "ArrowRight" && ohneZusatz && ergaenzung) {
      const feld = event.currentTarget;
      if (feld.selectionStart === value.length && feld.selectionEnd === value.length) {
        event.preventDefault();
        uebernehmen(ergaenzung);
      }
    } else if (event.key === "Escape" && listeOffen) {
      event.preventDefault();
      event.stopPropagation();
      setOffen(false);
      setAktiv(-1);
    }
  }

  return (
    <div className="relative">
      <Input
        {...rest}
        id={id}
        role="combobox"
        aria-autocomplete="both"
        aria-expanded={listeOffen}
        aria-controls={listeOffen ? listeId : undefined}
        aria-activedescendant={listeOffen && aktiv >= 0 ? `${listeId}-${aktiv}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOffen(true);
          setAktiv(-1);
        }}
        onFocus={(e) => {
          setFokus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFokus(false);
          setOffen(false);
          setAktiv(-1);
          onBlur?.(e);
        }}
        // Antippen oder Anklicken zeigt die Liste, Tab in das Feld nicht.
        onClick={() => setOffen(true)}
        onKeyDown={tasten}
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
      {listeOffen && (
        <ul
          id={listeId}
          role="listbox"
          aria-label="Vorschläge"
          className="absolute top-full left-0 z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
        >
          {treffer.map((t, i) => (
            <li
              key={t}
              id={`${listeId}-${i}`}
              role="option"
              aria-selected={i === aktiv}
              className={cn("cursor-pointer px-3 py-2.5 break-words", i === aktiv && "bg-accent text-accent-foreground")}
              // mousedown statt click: sonst verliert das Textfeld vorher den Fokus.
              onMouseDown={(e) => {
                e.preventDefault();
                uebernehmen(t);
              }}
            >
              {t}
            </li>
          ))}
          <li className="border-t px-3 py-1.5 text-xs text-muted-foreground [@media(pointer:coarse)]:hidden" aria-hidden>
            Tab übernimmt · ↑↓ wählen · Esc schließt
          </li>
        </ul>
      )}
    </div>
  );
}
