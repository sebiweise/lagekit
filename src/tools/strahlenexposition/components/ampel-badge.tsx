import { Badge } from "@/components/ui/badge";
import { WARN_ANTEIL, type Ampel } from "../logic";

const TEXT: Record<Ampel, string> = {
  gruen: `unter ${WARN_ANTEIL * 100} % des Richtwerts`,
  gelb: `ab ${WARN_ANTEIL * 100} % des Richtwerts`,
  rot: "Richtwert erreicht",
};

/** Ampel mit Text, damit sie auch ohne Farbwahrnehmung lesbar ist. */
export function AmpelBadge({ ampel }: { ampel: Ampel }) {
  const variant = ampel === "gruen" ? "ok" : ampel === "gelb" ? "warn" : "destructive";
  return (
    <Badge variant={variant} data-testid="ampel" data-ampel={ampel}>
      <span aria-hidden className="inline-block size-2.5 rounded-full bg-current" />
      {TEXT[ampel]}
    </Badge>
  );
}
