"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeftRight, CornerDownLeft, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ordnerDesEinsatzes } from "@/core/dateien/repository";
import { dateienFiltern, verweisText, type DateiTreffer } from "@/core/dateien/verweis";
import { getDb } from "@/core/db/db";
import { uhrzeitAnwenden } from "../logic";
import { eintragHinzufuegen, verfasserSpeichern } from "../repository";
import { EINTRAG_ARTEN, type Eintrag, type EintragArt } from "../schema";
import { ausloeserFinden, DateiAuswahl, type Ausloeser } from "./datei-auswahl";

/**
 * Eine Eingabezeile: Inhalt tippen, Enter speichert, die Zeit wird automatisch gesetzt.
 * Art, von/an und Verfasser bleiben für den nächsten Eintrag stehen.
 * Tastenkürzel: Alt+1 … Alt+5 wählt die Art, Esc leert die Zeile bzw. bricht eine Korrektur ab.
 */
export function Schnellerfassung({
  einsatzId,
  verfasserGespeichert,
  korrektur,
  onKorrekturEnde,
}: {
  einsatzId: string;
  verfasserGespeichert: string;
  korrektur: Eintrag | null;
  onKorrekturEnde: () => void;
}) {
  const [art, setArt] = useState<EintragArt>("Meldung");
  const [uhrzeit, setUhrzeit] = useState("");
  const [von, setVon] = useState("");
  const [an, setAn] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [verfasser, setVerfasser] = useState(verfasserGespeichert);
  const [fehler, setFehler] = useState<string | null>(null);
  const inhaltFeld = useRef<HTMLInputElement>(null);

  // „/“ im Inhalt: Datei aus einem verknüpften Ordner auswählen.
  const ordner = useLiveQuery(() => ordnerDesEinsatzes(getDb(), einsatzId), [einsatzId]);
  const [ausloeser, setAusloeser] = useState<Ausloeser | null>(null);
  const [aktiveDatei, setAktiveDatei] = useState(0);
  const hatDateien = (ordner ?? []).some((o) => o.dateien.length > 0);
  const treffer = ausloeser && hatDateien ? dateienFiltern(ordner ?? [], ausloeser.suche) : [];
  const auswahlOffen = treffer.length > 0;

  function inhaltGeaendert(wert: string, marke: number | null) {
    setInhalt(wert);
    setAusloeser(marke === null ? null : ausloeserFinden(wert, marke));
    setAktiveDatei(0);
  }

  function dateiWaehlen(t: DateiTreffer) {
    if (!ausloeser) return;
    const verweis = verweisText(t.ordner, t.pfad) + " ";
    const neu = inhalt.slice(0, ausloeser.start) + verweis + inhalt.slice(ausloeser.ende);
    const marke = ausloeser.start + verweis.length;
    setInhalt(neu);
    setAusloeser(null);
    markeNachher.current = marke;
  }

  function dateiTasten(event: KeyboardEvent<HTMLInputElement>) {
    if (!auswahlOffen) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const schritt = event.key === "ArrowDown" ? 1 : -1;
      setAktiveDatei((aktiveDatei + schritt + treffer.length) % treffer.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      dateiWaehlen(treffer[Math.min(aktiveDatei, treffer.length - 1)]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setAusloeser(null);
    }
  }

  function dateiKnopf() {
    const davor = inhalt && !/\s$/.test(inhalt) ? `${inhalt} /` : `${inhalt}/`;
    inhaltGeaendert(davor, davor.length);
    markeNachher.current = davor.length;
  }

  // Schreibmarke direkt nach dem Übernehmen setzen, bevor weitergetippt wird.
  const markeNachher = useRef<number | null>(null);
  useLayoutEffect(() => {
    const marke = markeNachher.current;
    if (marke === null) return;
    markeNachher.current = null;
    inhaltFeld.current?.focus();
    inhaltFeld.current?.setSelectionRange(marke, marke);
  }, [inhalt]);

  // Korrekturmodus: Felder mit dem alten Eintrag vorbelegen.
  const [korrekturId, setKorrekturId] = useState<string | null>(null);
  if (korrektur && korrektur.id !== korrekturId) {
    setKorrekturId(korrektur.id);
    setArt(korrektur.art);
    setVon(korrektur.von);
    setAn(korrektur.an);
    setInhalt(korrektur.inhalt);
  } else if (!korrektur && korrekturId) {
    setKorrekturId(null);
  }

  useEffect(() => {
    inhaltFeld.current?.focus();
  }, [korrektur]);

  async function absenden(event: FormEvent) {
    event.preventDefault();
    setFehler(null);
    const jetzt = new Date();
    let zeitpunkt: Date | undefined;
    if (uhrzeit.trim()) {
      const z = uhrzeitAnwenden(jetzt, uhrzeit);
      if (!z) {
        setFehler("Uhrzeit bitte als HH:MM eingeben oder leer lassen.");
        return;
      }
      zeitpunkt = z;
    }
    // Zeile sofort leeren, damit schnelles Weitertippen nicht vom Speichern
    // überschrieben wird; bei einem Fehler kommt der Text zurück.
    const gesendet = { inhalt, uhrzeit };
    setInhalt("");
    setUhrzeit("");
    if (korrektur) onKorrekturEnde();
    inhaltFeld.current?.focus();
    try {
      await eintragHinzufuegen(
        getDb(),
        { einsatzId, art, von, an, inhalt, verfasser, zeitpunkt, korrigiertEintragId: korrektur?.id ?? null },
        jetzt,
      );
      if (verfasser.trim() !== verfasserGespeichert) await verfasserSpeichern(getDb(), verfasser);
    } catch (e) {
      setInhalt(gesendet.inhalt);
      setUhrzeit(gesendet.uhrzeit);
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  function tasten(event: KeyboardEvent<HTMLFormElement>) {
    if (event.altKey && /^[1-5]$/.test(event.key)) {
      event.preventDefault();
      setArt(EINTRAG_ARTEN[Number(event.key) - 1]);
    } else if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      if (korrektur) onKorrekturEnde();
      setInhalt("");
    }
  }

  return (
    <form onSubmit={absenden} onKeyDown={tasten} className="flex flex-col gap-3" aria-label="Neuer Tagebucheintrag">
      {korrektur && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warn bg-warn/10 p-3">
          <span>
            Korrektur zu Eintrag <strong>Nr. {korrektur.nr}</strong>. Der alte Eintrag bleibt erhalten und wird als korrigiert
            markiert.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onKorrekturEnde}>
            <X /> Abbrechen
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <span id="tb-art-titel" className="text-sm font-medium">
          Art
        </span>
        <div role="radiogroup" aria-labelledby="tb-art-titel" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {EINTRAG_ARTEN.map((a, i) => (
            <Button
              key={a}
              type="button"
              role="radio"
              aria-checked={art === a}
              variant={art === a ? "default" : "outline"}
              className="px-2"
              onClick={() => {
                setArt(a);
                inhaltFeld.current?.focus();
              }}
            >
              {a}
              <span aria-hidden className="hidden text-xs opacity-60 @3xl:inline">
                Alt+{i + 1}
              </span>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tb-inhalt">Inhalt</Label>
        <div className="relative flex gap-2">
          <Input
            id="tb-inhalt"
            role="combobox"
            aria-expanded={auswahlOffen}
            aria-controls={auswahlOffen ? "tb-dateien" : undefined}
            aria-activedescendant={auswahlOffen ? `tb-datei-${aktiveDatei}` : undefined}
            aria-autocomplete="list"
            ref={inhaltFeld}
            autoComplete="off"
            enterKeyHint="send"
            required
            className="h-14 flex-1 text-lg"
            placeholder={hatDateien ? "Text eingeben, / verknüpft eine Datei, Enter speichert" : "Text eingeben, Enter speichert"}
            value={inhalt}
            onChange={(e) => inhaltGeaendert(e.target.value, e.target.selectionStart)}
            onKeyDown={dateiTasten}
            onBlur={() => setAusloeser(null)}
          />
          {hatDateien && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-14 w-14"
              aria-label="Datei verknüpfen"
              title="Datei verknüpfen (/ im Text)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={dateiKnopf}
            >
              <Paperclip />
            </Button>
          )}
          {auswahlOffen && <DateiAuswahl treffer={treffer} aktiv={aktiveDatei} onWaehlen={dateiWaehlen} />}
          <Button type="submit" size="lg" className="h-14 px-5" aria-label="Eintrag speichern">
            <CornerDownLeft /> <span className="hidden sm:inline">Speichern</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_8rem_14rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tb-von">Von</Label>
          <Input id="tb-von" autoComplete="off" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Von und An tauschen"
          title="Von und An tauschen (Rückmeldung)"
          onClick={() => {
            setVon(an);
            setAn(von);
          }}
        >
          <ArrowLeftRight />
        </Button>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tb-an">An</Label>
          <Input id="tb-an" autoComplete="off" value={an} onChange={(e) => setAn(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 max-sm:col-span-1">
          <Label htmlFor="tb-uhrzeit">Uhrzeit</Label>
          <Input
            id="tb-uhrzeit"
            inputMode="numeric"
            placeholder="jetzt"
            autoComplete="off"
            value={uhrzeit}
            onChange={(e) => setUhrzeit(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 max-sm:col-span-2">
          <Label htmlFor="tb-verfasser">Verfasser</Label>
          <Input id="tb-verfasser" autoComplete="off" value={verfasser} onChange={(e) => setVerfasser(e.target.value)} />
        </div>
      </div>
      <p className="hidden text-xs text-muted-foreground lg:block">
        Enter speichert · Alt+1 bis Alt+5 wählt die Art · Esc leert · / außerhalb des Textfelds springt zur Suche, im Textfeld verknüpft es eine Datei · Uhrzeit leer = jetzt
      </p>
      {fehler && (
        <p role="alert" className="text-sm text-destructive">
          {fehler}
        </p>
      )}
    </form>
  );
}
