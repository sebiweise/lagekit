# Gemeinsam an einem Einsatz arbeiten (Beta)

> **Beta:** Die Funktion ist in der App als „Beta“ gekennzeichnet, bis sie in einer Übung mit mehreren Geräten erprobt ist.

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
- **Keine Änderung geht unterwegs verloren:** Jede Änderung eines Gasts kommt zuerst in einen dauerhaften Ausgang und wird dann gesendet. Erst die Quittung des Hosts entfernt sie. Was bei einem Abriss unterwegs war oder während der Trennung entstand, schickt der Gast beim Wiederverbinden mit dem ersten Gruß an den Host, bevor er dessen Stand übernimmt. Der Ausgang übersteht auch ein Neuladen.
- **Übergabe des Stands:** Änderungen, die entstehen, während der Host einem Gerät seinen Stand schickt, hält er zurück und schickt sie direkt danach. Nachrichten werden auf beiden Seiten streng nacheinander verarbeitet.
- **Einsatz löschen:** Löscht ein Gast den Einsatz auf seinem Gerät, verlässt er die Sitzung; beim Host und den anderen Geräten bleibt alles erhalten. Löscht der Host den Einsatz, endet die Sitzung, und die Gäste behalten ihre Kopie. Ein Gerät kann weder den Einsatz noch Zeilen anderer Einsätze auf einem anderen Gerät löschen oder überschreiben.
- **Mehrere Tabs:** Nur ein Tab pro Browser führt die Sitzung (Web Locks). Andere Tabs zeigen einen Hinweis und übernehmen automatisch, sobald der erste Tab geschlossen wird.
- **Freigaben:** Gäste sehen von den anderen Teilnehmern nur Sitzungs-Kennungen, nie deren Geräte-Kennungen. Ein getrenntes Gerät kann sich so nicht als ein anderes, bereits zugelassenes Gerät ausgeben.
- **Vermittlungsdienst:** Höchstens 600 Aufrufe pro Minute und IP-Adresse (alle Geräte im ELW teilen sich meist eine), Beitrittsanfragen zusätzlich höchstens 30 pro Minute. Ein erratener Kurzcode erlaubt nur eine Anfrage, die der Host sieht und ablehnen kann.
- **Konflikte:** Tools können im Manifest eine Konfliktlösung je Tabelle angeben (`abgleich`); der Host wendet sie auf alle eingehenden Zeilen an und verteilt das Ergebnis. Das Einsatztagebuch vergibt so bei doppelten Nummern die nächste freie.

## Grenzen (Stand jetzt)

- Auf dem QR-Weg ist nach einem Abriss erneutes Scannen nötig (es gibt keinen Kanal für den neuen Verbindungsaufbau). Der Host muss das Gerät aber nicht erneut zulassen.
- iPhones trennen die Verbindung, wenn der Bildschirm gesperrt wird; auf dem Kurzcode-Weg verbinden sie sich danach selbst neu.
- Zwei Geräte, die dieselbe Zeile (z. B. denselben Aufenthalt) gleichzeitig ändern: Es gilt die Änderung, die zuletzt beim Host ankommt. Das gilt auch für eine Änderung, die nach einem Abriss erneut geschickt wird.
- Änderungen in einem zweiten Tab, der die Sitzung nicht führt, werden nicht abgeglichen (der Tab weist darauf hin).
- Wer den Kurzcode kennt, kann Anfragen schicken; zugelassen wird aber nur, wen der Host freigibt. Der Vermittlungsdienst sieht die Verbindungsdaten (keine Einsatzdaten) und ist damit Vertrauensanker des Kurzcode-Wegs; wer das nicht möchte, nutzt den QR-Weg.
- Ob ein Handy-Hotspot Geräte untereinander verbindet, hängt vom Gerät ab und ist im Praxistest zu prüfen.
