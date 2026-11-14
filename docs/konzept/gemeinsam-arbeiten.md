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

## Grenzen (Stand jetzt)

- Ein volles Neuladen der Seite beendet die Sitzung auf diesem Gerät; Navigation innerhalb der App nicht. Danach erneut beitreten.
- iPhones trennen die Verbindung, wenn der Bildschirm gesperrt wird.
- Zwei Geräte, die im selben Moment einen Tagebucheintrag anlegen, können dieselbe laufende Nummer vergeben. Die Einträge bleiben beide erhalten.
- Änderungen, die ein Gerät nach dem Trennen macht, gehen nicht automatisch an den Host. Abhilfe: JSON-Sicherung.
- Ob ein Handy-Hotspot Geräte untereinander verbindet, hängt vom Gerät ab und ist im Praxistest zu prüfen.
