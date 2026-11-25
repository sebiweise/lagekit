"use client";

import { useState, useSyncExternalStore } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Send, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOnline } from "@/core/pwa/components/use-online";
import { HILFE_URL } from "@/core/projekt";
import { APP_VERSION } from "@/core/version";
import { t } from "@/i18n";
import {
  FEEDBACK_ARTEN,
  FEEDBACK_ENDPUNKT,
  NACHRICHT_MAX,
  feedbackBody,
  feedbackFormularSchema,
  feedbackSenden,
  plattform,
  type FeedbackArt,
  type FeedbackEingabe,
  type FeedbackFormularWerte,
} from "../senden";

const LEER: FeedbackFormularWerte = { art: "bug", nachricht: "", email: "", diagnose: true, website: "" };

const nieAendern = () => () => {};

function plattformJetzt(): string {
  const hinweis = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  const installiert =
    matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return plattform(navigator.userAgent, hinweis, installiert);
}

/** Plattform erst im Browser; beim Vorrendern leer. */
function usePlattform(): string {
  return useSyncExternalStore(nieAendern, plattformJetzt, () => "");
}

const linkKlasse = "inline-flex min-h-11 items-center gap-2 underline underline-offset-4";

function GithubLink() {
  return (
    <a href={HILFE_URL} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
      {t.feedback.github} <ExternalLink className="size-4" aria-label="öffnet in neuem Tab" />
    </a>
  );
}

/**
 * Feedback-Formular: schickt nur auf Knopfdruck, nur den eingegebenen Text (siehe ../senden.ts).
 * Ist der Dienst in dieser Installation aus, bleibt nur der Link zu GitHub.
 */
export function FeedbackFormular() {
  const online = useOnline();
  const plattformText = usePlattform();
  const form = useForm<FeedbackFormularWerte, unknown, FeedbackEingabe>({
    resolver: zodResolver(feedbackFormularSchema),
    defaultValues: LEER,
  });
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);

  if (!FEEDBACK_ENDPUNKT) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg leading-relaxed" data-testid="feedback-aus">
          {t.feedback.aus}
        </p>
        <GithubLink />
      </div>
    );
  }
  const endpunkt = FEEDBACK_ENDPUNKT;

  async function senden(werte: FeedbackEingabe) {
    setFehler(null);
    const ergebnis = await feedbackSenden(
      endpunkt,
      feedbackBody(werte, { appVersion: APP_VERSION, platform: plattformText || "unbekannt" }),
      { online: navigator.onLine },
    );
    if (ergebnis.ok) {
      setGesendet(true);
      form.reset(LEER);
    } else {
      setFehler(ergebnis.fehler);
    }
  }

  if (gesendet) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="status" className="text-lg font-medium">
          {t.feedback.danke}
        </p>
        <Button variant="outline" onClick={() => setGesendet(false)}>
          {t.feedback.weiteres}
        </Button>
      </div>
    );
  }

  const laeuft = form.formState.isSubmitting;
  return (
    <form noValidate onSubmit={form.handleSubmit(senden)} className="flex flex-col gap-4" aria-label={t.feedback.titel}>
      <p className="text-lg leading-relaxed">{t.feedback.einleitung}</p>
      <p className="text-sm leading-relaxed text-muted-foreground" data-testid="feedback-datenschutz">
        {t.feedback.datenschutz}
      </p>
      <Controller
        name="art"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel id="feedback-art">{t.feedback.artLabel}</FieldLabel>
            <ToggleGroup
              aria-labelledby="feedback-art"
              className="grid w-full grid-cols-3 bg-muted"
              size="sm"
              value={[field.value]}
              onValueChange={(wert) => {
                const neu = wert[0] as FeedbackArt | undefined;
                if (neu) field.onChange(neu);
              }}
            >
              {FEEDBACK_ARTEN.map((art) => (
                <ToggleGroupItem key={art} value={art} className="h-11 data-pressed:bg-background data-pressed:shadow-sm">
                  {t.feedback.arten[art]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        )}
      />
      <Controller
        name="nachricht"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="feedback-nachricht">{t.feedback.nachrichtLabel}</FieldLabel>
            <Textarea
              {...field}
              id="feedback-nachricht"
              aria-required
              aria-invalid={fieldState.invalid}
              maxLength={NACHRICHT_MAX}
              rows={6}
              className="text-lg"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <FieldDescription className="text-sm">{t.feedback.nachrichtHinweis}</FieldDescription>
          </Field>
        )}
      />
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="feedback-email">{t.feedback.emailLabel}</FieldLabel>
            <Input
              {...field}
              id="feedback-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <FieldDescription className="text-sm">{t.feedback.emailHinweis}</FieldDescription>
          </Field>
        )}
      />
      <Controller
        name="diagnose"
        control={form.control}
        render={({ field }) => (
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox className="mt-0.5" checked={field.value} onCheckedChange={(an) => field.onChange(an === true)} />
            <span>{t.feedback.diagnoseLabel(APP_VERSION, plattformText || "…")}</span>
          </label>
        )}
      />
      {/* Falle für Bots: für Menschen unsichtbar und nicht per Tab erreichbar. */}
      <div aria-hidden className="absolute -left-[10000px] size-px overflow-hidden">
        <label htmlFor="feedback-website">{t.feedback.honeypotLabel}</label>
        <Input {...form.register("website")} id="feedback-website" tabIndex={-1} autoComplete="off" />
      </div>
      {!online && (
        <p className="flex items-start gap-2 text-muted-foreground" data-testid="feedback-offline">
          <WifiOff className="mt-1 size-4 shrink-0" aria-hidden /> {t.feedback.offline}
        </p>
      )}
      {fehler && (
        <p role="alert" className="text-destructive">
          {fehler}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Button type="submit" disabled={laeuft || !online}>
          <Send /> {laeuft ? t.feedback.wirdGesendet : t.feedback.senden}
        </Button>
        <GithubLink />
      </div>
    </form>
  );
}
