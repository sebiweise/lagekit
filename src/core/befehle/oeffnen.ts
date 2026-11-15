/** Öffnet die Befehlspalette von anderer Stelle (z. B. „Mehr“ am Handy, wo der Knopf in der Kopfzeile fehlt). */
export const BEFEHLE_OEFFNEN = "lagekit:befehle-oeffnen";

export function befehlspaletteOeffnen(): void {
  window.dispatchEvent(new Event(BEFEHLE_OEFFNEN));
}
