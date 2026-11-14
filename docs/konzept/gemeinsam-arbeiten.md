# Gemeinsam an einem Einsatz arbeiten

Mehrere Geräte (Tablets, Handys, ELW-Rechner) arbeiten am selben Einsatz. Ein Gerät leitet die Sitzung (Host), weitere Geräte treten bei. Seite in der App: `/sitzung/` („Gemeinsam“).

## Grundsätze

- **Kein Server für Einsatzdaten.** Die Geräte verbinden sich direkt über WebRTC (Datenkanal, verschlüsselt mit DTLS). Ohne STUN/TURN: Alle Geräte müssen im selben Netz sein (ELW-Router, Handy-Hotspot). Die Einsatzdaten verlassen das lokale Netz nie.
- **Der Host entscheidet.** Jede Anfrage zeigt Name, Funktion, Fahrzeug und Gerät. Erst nach „Zulassen“ entsteht die Verbindung, und das Gerät erhält den Einsatz. Offene Anfragen erscheinen auf jeder Seite der App, damit der Host sie nicht übersieht. Der Host kann Geräte jederzeit trennen.
- **Der Host hält den maßgeblichen Stand.** Beim Beitritt übernimmt das Gerät den vollständigen Stand des Einsatzes. Danach gehen Änderungen jedes Geräts an den Host, der sie prüft, speichert und an alle anderen verteilt. Jedes Gerät speichert eine Kopie; reißt die Verbindung ab, bleiben die Daten lokal erhalten.

## Zwei Wege zum Beitritt

Das beitretende Gerät wählt den Weg selbst, auch wenn Internet da ist.

1. **Kurzcode (braucht kurz Internet).** Der Host zeigt einen 6-stelligen Code. Über den Vermittlungsdienst (`api/vermittlung.ts`, Vercel-Funktion mit Upstash Redis) laufen nur Beitrittsanfrage und Antwort, also die Verbindungsdaten, und das nur für wenige Minuten. Danach läuft die Sitzung auch ohne Internet weiter.
2. **QR-Code (ganz offline).** Das Gerät zeigt seinen Beitrittscode, der Host scannt ihn, lässt zu und zeigt seinen Antwortcode, den das Gerät scannt. Ohne Kamera lassen sich beide Codes kopieren oder als Datei übertragen (z. B. USB-Stick).

## Technik

| Baustein | Datei |
| --- | --- |
| Kompakte Verbindungsdaten (SDP auf ICE-Daten, Fingerabdruck und Kandidaten verdichtet, komprimiert) | `src/core/sync/verbindungscode.ts` |
| Nachrichten und Codes (Zod) | `src/core/sync/protokoll.ts` |
| Änderungen erfassen (Dexie-Hooks, nur Zeilen des Sitzungs-Einsatzes, kein Echo) | `src/core/sync/erfassung.ts` |
| Stand übernehmen, Änderungen prüfen und anwenden | `src/core/sync/daten.ts` |
| WebRTC-Verbindung, große Nachrichten in Teilen | `src/core/sync/peer.ts` |
| Host- und Gast-Sitzung | `src/core/sync/sitzung.ts` |
| Vermittlungsdienst (Logik und Upstash-Speicher) | `src/core/sync/vermittlung-dienst.ts` |

Neue Tools nehmen automatisch teil: Abgeglichen werden alle Tabellen aus dem Tool-Manifest (`tabellen`), dazu `einsaetze`. Geräteeinstellungen (z. B. Richtwerte, aktiver Einsatz) bleiben je Gerät.

## Einrichtung des Kurzcode-Wegs

Im Vercel-Projekt Upstash Redis aus dem Marketplace verbinden. Die Funktion liest `KV_REST_API_URL` und `KV_REST_API_TOKEN` (oder `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`). Ohne diese Variablen meldet der Host „Kein Kurzcode“, der QR-Weg funktioniert weiter.

## Robustheit

- **Neuladen:** Host und Gast speichern ihre Sitzung in den Geräteeinstellungen und stellen sie nach dem Laden wieder her. Der Host behält seinen Kurzcode.
- **Wiederverbinden:** Reißt die Verbindung ab, verbindet sich ein Gast auf dem Kurzcode-Weg selbst neu (Wartezeit wachsend bis 30 s). Geräte, die der Host in dieser Sitzung schon zugelassen hat, kommen ohne erneute Freigabe wieder rein („wieder aufgenommen“). Erst Trennen oder Ablehnen durch den Host nimmt diese Freigabe zurück.
- **Abriss erkennen:** Beide Seiten senden alle 2 s ein Lebenszeichen; nach 8 s Stille gilt die Verbindung als abgerissen.
- **Änderungen während einer Trennung:** Der Gast sammelt sie und schickt sie beim Wiederverbinden mit dem ersten Gruß an den Host, bevor er dessen Stand übernimmt. Die Sammlung übersteht auch ein Neuladen.
- **Konflikte:** Tools können im Manifest eine Konfliktlösung je Tabelle angeben (`abgleich`); der Host wendet sie auf alle eingehenden Zeilen an und verteilt das Ergebnis. Das Einsatztagebuch vergibt so bei doppelten Nummern die nächste freie.

## Grenzen (Stand jetzt)

- Auf dem QR-Weg ist nach einem Abriss erneutes Scannen nötig (es gibt keinen Kanal für den neuen Verbindungsaufbau). Der Host muss das Gerät aber nicht erneut zulassen.
- iPhones trennen die Verbindung, wenn der Bildschirm gesperrt wird; auf dem Kurzcode-Weg verbinden sie sich danach selbst neu.
- Zwei Geräte, die dieselbe Zeile (z. B. denselben Aufenthalt) gleichzeitig ändern: Es gilt die Änderung, die zuletzt beim Host ankommt.
- Die Sitzung gilt je Browser; mehrere offene Tabs desselben Browsers sind nicht vorgesehen.
- Ob ein Handy-Hotspot Geräte untereinander verbindet, hängt vom Gerät ab und ist im Praxistest zu prüfen.
