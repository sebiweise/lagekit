# Karte und Standort

## Standort statt Eintippen

Am Feld „Ort“ (neuer Einsatz) übernimmt der Knopf „Standort“ den eigenen Standort (GPS bzw. Ortungsdienste). Die Freigabe fragt das Gerät erst beim ersten Antippen ab.

- **Mit Internet:** Die Koordinaten werden über Nominatim (OpenStreetMap) in eine Adresse umgewandelt, z. B. „Obere Königsstraße 8, 34117 Kassel“.
- **Ohne Internet:** Der Ort wird als Koordinaten eingetragen.
- Der Punkt wird zusätzlich am Einsatz gespeichert (`einsatz.koordinaten`) und mit abgeglichen. Angezeigt wird er auch als UTMREF (z. B. `32U NB 33433 84708`), wie im BOS-Funk üblich.

## Karte (Tool `karte`)

OpenStreetMap direkt in der App (Leaflet). Zeigt Einsatzort, eigenen Standort (mit Genauigkeit), einen angetippten oder gesuchten Punkt, jeweils mit UTMREF, Koordinaten und Entfernung/Richtung. Ein Punkt lässt sich als Einsatzort setzen oder an die Navigation des Geräts übergeben.

## Nutzungsregeln von OpenStreetMap (geprüft 2026-11-15)

Quellen: [Kacheln](https://operations.osmfoundation.org/policies/tiles/), [Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

| Regel | Umsetzung |
| --- | --- |
| Namensnennung sichtbar auf der Karte | „© OpenStreetMap-Mitwirkende“ unten rechts |
| Gültiger Referer aus dem Browser | Standard-Referrer-Policy, nicht eingeschränkt |
| Kacheln nach HTTP-Vorgaben cachen | Browser-Cache; kein eigenes Umgehen |
| **Kein** Vorabladen / „für offline herunterladen“ | Gibt es nicht. Offline nur, was schon angesehen wurde |
| Nominatim höchstens 1 Anfrage/s, Ergebnisse cachen | Taktung und Zwischenspeicher in `src/core/standort/adresse.ts` |
| Nominatim: keine Autovervollständigung | Suche nur auf Knopfdruck |
| Dienst muss austauschbar sein | Kachel-Adresse nur in `src/tools/karte/kacheln.ts`, Nominatim nur in `adresse.ts` |

Es gibt keine Verfügbarkeitsgarantie. Eine echte Offline-Karte bräuchte einen eigenen Kachelserver oder einen Anbieter, der Offline-Nutzung erlaubt.

## Arbeitsbereich

`/arbeitsbereich/`: mehrere Tools als Tabs in einem Fenster, auf breiten Bildschirmen (ab 1024 px) frei aufgeteilt (siehe [Bedienung im Einsatz](../konzept/bedienung-im-einsatz.md#arbeitsbereich-selbst-anordnen)). Offene Tabs bleiben geladen, halb ausgefüllte Eingaben gehen beim Wechseln nicht verloren. Die offenen Tabs merkt sich jedes Gerät selbst. Neue Tools tragen ihre Hauptkomponente in `src/tools/ansichten.tsx` ein.
