import { Badge } from "@/components/ui/badge";
import { t } from "@/i18n";
import { AKTUELLE_VERSION } from "../aktuell";
import { istLeer } from "../changelog";
import { ChangelogListe } from "./changelog-liste";
import { UpdatePruefung } from "./update-pruefung";

/** Wartendes Update (falls vorhanden) und alle Änderungen der installierten Version. */
export function Aenderungen() {
  const verlauf = AKTUELLE_VERSION.changelog.filter((a) => !istLeer(a));
  return (
    <>
      <UpdatePruefung />
      <section aria-labelledby="verlauf-titel" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="verlauf-titel" className="text-xl font-semibold">
            {t.aenderungen.verlauf}
          </h2>
          <Badge variant="outline" data-testid="aenderungen-version">
            {t.aenderungen.installiert}: {AKTUELLE_VERSION.version} ({AKTUELLE_VERSION.commit})
          </Badge>
        </div>
        {verlauf.length > 0 ? <ChangelogListe abschnitte={verlauf} /> : <p>{t.aenderungen.leer}</p>}
      </section>
    </>
  );
}
