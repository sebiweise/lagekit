/**
 * Kartenkacheln von OpenStreetMap (https://operations.osmfoundation.org/policies/tiles/).
 *
 * Erlaubt: normales Ansehen, Namensnennung sichtbar auf der Karte, der Browser cacht
 * angesehene Kacheln nach den HTTP-Vorgaben des Servers. Nicht erlaubt: Gebiete vorab
 * für offline herunterladen. Deshalb gibt es offline nur, was zuvor angesehen wurde.
 * Für eine echte Offline-Karte bräuchte es einen eigenen Kachelserver oder einen
 * Anbieter, der das erlaubt; dann nur diese Datei ändern.
 */
export const KACHEL_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const KACHEL_NAMENSNENNUNG =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>-Mitwirkende';
export const MAX_ZOOM = 19;
