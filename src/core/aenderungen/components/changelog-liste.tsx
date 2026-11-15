import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { DATEN_GRUPPE, type ChangelogAbschnitt } from "../changelog";

function datumLesbar(datum: string): string {
  const [jahr, monat, tag] = datum.split("-");
  return `${tag}.${monat}.${jahr}`;
}

/** Punkt mit `Code` in Backticks; weiteres Markdown wird als Text gezeigt. */
function PunktText({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((teil, i) =>
    teil.startsWith("`") && teil.endsWith("`") && teil.length > 1 ? (
      <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.9em] break-all">
        {teil.slice(1, -1)}
      </code>
    ) : (
      teil
    ),
  );
}

/** Abschnitte aus CHANGELOG.md; die Gruppe „Daten“ ist hervorgehoben. */
export function ChangelogListe({
  abschnitte,
  ueberschriftStufe = 3,
}: {
  abschnitte: ChangelogAbschnitt[];
  ueberschriftStufe?: 2 | 3;
}) {
  const H = ueberschriftStufe === 2 ? "h2" : "h3";
  const G = ueberschriftStufe === 2 ? "h3" : "h4";
  return (
    <div className="flex flex-col gap-5">
      {abschnitte.map((abschnitt) => (
        <section key={abschnitt.version ?? "unveroeffentlicht"} className="flex flex-col gap-2">
          <H className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
            {abschnitt.version ? t.aenderungen.versionTitel(abschnitt.version) : t.aenderungen.unveroeffentlicht}
            {abschnitt.datum && (
              <span className="text-sm font-normal text-muted-foreground">{datumLesbar(abschnitt.datum)}</span>
            )}
          </H>
          {abschnitt.einleitung && <p className="text-muted-foreground">{abschnitt.einleitung}</p>}
          {abschnitt.gruppen.map((gruppe) => {
            const daten = gruppe.titel === DATEN_GRUPPE;
            return (
              <div
                key={gruppe.titel}
                className={cn("flex flex-col gap-1", daten && "rounded-md border border-warn bg-warn/10 p-3")}
              >
                <G className="flex items-center gap-2 font-medium">
                  {daten && <Database className="size-4" />}
                  {gruppe.titel}
                </G>
                <ul className="list-disc space-y-1 pl-5">
                  {gruppe.punkte.map((punkt) => (
                    <li key={punkt}>
                      <PunktText text={punkt} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
