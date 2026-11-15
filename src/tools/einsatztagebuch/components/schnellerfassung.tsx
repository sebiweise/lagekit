"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeftRight, CornerDownLeft, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ordnerDesEinsatzes } from "@/core/dateien/repository";
import { dateienFiltern, verweisText, type DateiTreffer } from "@/core/dateien/verweis";
import { getDb } from "@/core/db/db";
import { fehlerText } from "@/lib/formular";
import { useVonAnVorschlaege } from "../hooks";
import { eintragHinzufuegen, verfasserSpeichern } from "../repository";
import { eintragFormularSchema, type EintragFormularWerte } from "../formular";
import { uhrzeitAnwenden } from "../logic";
import { EINTRAG_ARTEN, type Eintrag } from "../schema";
import { ausloeserFinden, DateiAuswahl, type Ausloeser } from "./datei-auswahl";
import { VorschlagFeld } from "./vorschlag-feld";

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
  const [fehler, setFehler] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(eintragFormularSchema),
    defaultValues: {
      art: "Meldung",
      inhalt: "",
      von: "",
      an: "",
      verfasser: verfasserGespeichert,
      uhrzeit: "",
    } satisfies EintragFormularWerte,
  });
  const inhalt = useWatch({ control: form.control, name: "inhalt" });
  const inhaltFeld = useRef<HTMLInputElement | null>(null);
  const vonAnVorschlaege = useVonAnVorschlaege(einsatzId);

  // „/“ im Inhalt: Datei aus einem verknüpften Ordner auswählen.
  const ordner = useLiveQuery(() => ordnerDesEinsatzes(getDb(), einsatzId), [einsatzId]);
  const [ausloeser, setAusloeser] = useState<Ausloeser | null>(null);
  const [aktiveDatei, setAktiveDatei] = useState(0);
  const hatDateien = (ordner ?? []).some((o) => o.dateien.length > 0);
  const treffer = ausloeser && hatDateien ? dateienFiltern(ordner ?? [], ausloeser.suche) : [];
  const auswahlOffen = treffer.length > 0;

  function inhaltSetzen(wert: string) {
    form.setValue("inhalt", wert, { shouldValidate: form.formState.isSubmitted });
  }

  function inhaltGeaendert(wert: string, marke: number | null) {
    inhaltSetzen(wert);
    setAusloeser(marke === null ? null : ausloeserFinden(wert, marke));
    setAktiveDatei(0);
  }

  function dateiWaehlen(t: DateiTreffer) {
    if (!ausloeser) return;
    const verweis = verweisText(t.ordner, t.pfad) + " ";
    const neu = inhalt.slice(0, ausloeser.start) + verweis + inhalt.slice(ausloeser.ende);
    const marke = ausloeser.start + verweis.length;
    inhaltSetzen(neu);
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
  useEffect(() => {
    if (korrektur) {
      form.setValue("art", korrektur.art);
      form.setValue("von", korrektur.von);
      form.setValue("an", korrektur.an);
      form.setValue("inhalt", korrektur.inhalt);
      form.clearErrors();
    }
    inhaltFeld.current?.focus();
  }, [korrektur, form]);

  async function absenden(werte: z.output<typeof eintragFormularSchema>) {
    setFehler(null);
    const jetzt = new Date();
    const zeitpunkt = werte.uhrzeit ? (uhrzeitAnwenden(jetzt, werte.uhrzeit) ?? undefined) : undefined;
    // Zeile sofort leeren, damit schnelles Weitertippen nicht vom Speichern
    // überschrieben wird; bei einem Fehler kommt der Text zurück.
    const gesendet = form.getValues();
    form.setValue("inhalt", "");
    form.setValue("uhrzeit", "");
    if (korrektur) onKorrekturEnde();
    inhaltFeld.current?.focus();
    try {
      const { art, von, an, inhalt, verfasser } = werte;
      await eintragHinzufuegen(
        getDb(),
        { einsatzId, art, von, an, inhalt, verfasser, zeitpunkt, korrigiertEintragId: korrektur?.id ?? null },
        jetzt,
      );
      if (werte.verfasser !== verfasserGespeichert) await verfasserSpeichern(getDb(), werte.verfasser);
    } catch (e) {
      form.setValue("inhalt", gesendet.inhalt);
      form.setValue("uhrzeit", gesendet.uhrzeit);
      setFehler(fehlerText(e));
    }
  }

  function tasten(event: KeyboardEvent<HTMLFormElement>) {
    if (event.altKey && /^[1-5]$/.test(event.key)) {
      event.preventDefault();
      form.setValue("art", EINTRAG_ARTEN[Number(event.key) - 1]);
    } else if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      if (korrektur) onKorrekturEnde();
      form.setValue("inhalt", "");
      form.clearErrors();
    }
  }

  return (
    <form noValidate onSubmit={(e) => void form.handleSubmit(absenden)(e)} onKeyDown={tasten} className="flex flex-col gap-3" aria-label="Neuer Tagebucheintrag">
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
      <Controller
        name="art"
        control={form.control}
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <span id="tb-art-titel" className="text-sm font-medium">
              Art
            </span>
            <ToggleGroup
              aria-labelledby="tb-art-titel"
              variant="outline"
              className="grid w-full grid-cols-3 sm:grid-cols-5"
              value={[field.value]}
              onValueChange={(wert) => {
                if (!wert[0]) return;
                field.onChange(wert[0] as (typeof EINTRAG_ARTEN)[number]);
                inhaltFeld.current?.focus();
              }}
            >
              {EINTRAG_ARTEN.map((a, i) => (
                <ToggleGroupItem key={a} value={a} className="px-2">
                  {a}
                  <span aria-hidden className="hidden text-xs opacity-60 @3xl:inline">
                    Alt+{i + 1}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      />
      <Controller
        name="inhalt"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1.5">
            <FieldLabel htmlFor="tb-inhalt">Inhalt</FieldLabel>
            <div className="relative flex gap-2">
              <Input
                id="tb-inhalt"
                name={field.name}
                role="combobox"
                aria-expanded={auswahlOffen}
                aria-controls={auswahlOffen ? "tb-dateien" : undefined}
                aria-activedescendant={auswahlOffen ? `tb-datei-${aktiveDatei}` : undefined}
                aria-autocomplete="list"
                aria-required
                aria-invalid={fieldState.invalid}
                ref={(el) => {
                  field.ref(el);
                  inhaltFeld.current = el;
                }}
                autoComplete="off"
                enterKeyHint="send"
                className="h-14 flex-1 text-lg"
                placeholder={hatDateien ? "Text eingeben, / verknüpft eine Datei, Enter speichert" : "Text eingeben, Enter speichert"}
                value={field.value}
                onChange={(e) => inhaltGeaendert(e.target.value, e.target.selectionStart)}
                onKeyDown={dateiTasten}
                onBlur={() => {
                  field.onBlur();
                  setAusloeser(null);
                }}
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
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:grid-cols-[1fr_auto_1fr_8rem_14rem]">
        <Controller
          name="von"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5">
              <FieldLabel htmlFor="tb-von">Von</FieldLabel>
              <VorschlagFeld {...field} id="tb-von" aria-invalid={fieldState.invalid} vorschlaege={vonAnVorschlaege} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Von und An tauschen"
          title="Von und An tauschen (Rückmeldung)"
          className="mt-5"
          onClick={() => {
            const { von, an } = form.getValues();
            form.setValue("von", an);
            form.setValue("an", von);
          }}
        >
          <ArrowLeftRight />
        </Button>
        <Controller
          name="an"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5">
              <FieldLabel htmlFor="tb-an">An</FieldLabel>
              <VorschlagFeld {...field} id="tb-an" aria-invalid={fieldState.invalid} vorschlaege={vonAnVorschlaege} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="uhrzeit"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5">
              <FieldLabel htmlFor="tb-uhrzeit">Uhrzeit</FieldLabel>
              <Input {...field} id="tb-uhrzeit" aria-invalid={fieldState.invalid} autoComplete="off" inputMode="numeric" placeholder="jetzt" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="verfasser"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5 max-sm:col-span-2">
              <FieldLabel htmlFor="tb-verfasser">Verfasser</FieldLabel>
              <Input {...field} id="tb-verfasser" aria-invalid={fieldState.invalid} autoComplete="off" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <p className="hidden text-xs text-muted-foreground lg:block">
        Enter speichert · Alt+1 bis Alt+5 wählt die Art · Tab ergänzt Von/An · Esc leert · / außerhalb des Textfelds springt zur Suche, im Textfeld verknüpft es eine Datei · Uhrzeit leer = jetzt
      </p>
      {fehler && (
        <p role="alert" className="text-sm text-destructive">
          {fehler}
        </p>
      )}
    </form>
  );
}
