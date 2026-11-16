# Cloudflare Workers

Ein Cloudflare Worker betreibt den Kurzcode-Dienst für „Gemeinsam arbeiten“, auf Wunsch zusammen mit der ganzen App. Die Kurzcodes liegen in einem Durable Object mit eigener SQLite-Datenbank. Beides gibt es im kostenlosen Workers-Plan; ein Upstash- oder anderes Redis-Konto ist nicht nötig. Den Dienst des Lagekit-Projekts unter `https://lagekit-kurzcode.sebiweise.workers.dev` betreibt genau dieser Worker.

Der Code liegt in [`cloudflare/worker.ts`](../../cloudflare/worker.ts), die Logik teilt er sich mit den anderen Varianten (`src/core/sync/vermittlung-dienst.ts`).

## Zwei Varianten

| Variante | Konfiguration | Passt, wenn … |
| --- | --- | --- |
| Nur Kurzcode-Dienst | [`cloudflare/wrangler.jsonc`](../../cloudflare/wrangler.jsonc), Worker `lagekit-kurzcode` | die App woanders läuft, z. B. auf Vercel, im Docker-Container oder als ZIP |
| App und Kurzcode | [`wrangler.jsonc`](../../wrangler.jsonc), Worker `lagekit` | alles bei Cloudflare liegen soll |

## Nur Kurzcode-Dienst

### Aus dem Repository (empfohlen)

1. Das Repository [sebiweise/lagekit](https://github.com/sebiweise/lagekit) auf GitHub forken.
2. Im Cloudflare-Dashboard **Workers & Pages → Create → Workers → Import a repository** wählen und den Fork verbinden.
3. Einstellungen:

   | Einstellung | Wert |
   | --- | --- |
   | Project name | `lagekit-kurzcode` |
   | Build command | leer lassen |
   | Deploy command | `pnpm exec wrangler deploy -c cloudflare/wrangler.jsonc` |
   | Root directory | `/` |

   Unter **Build variables** `PNPM_VERSION` auf die Version aus `packageManager` in `package.json` setzen (z. B. `12.18.0`). Damit der Worker nicht bei jeder Änderung an der App neu gebaut wird, unter **Build watch paths** `cloudflare/*` und `src/core/sync/*` eintragen.
4. **Deploy**. Der Worker ist danach unter `https://lagekit-kurzcode.<konto>.workers.dev` erreichbar. Wer die Adresse im Browser öffnet, sieht einen kurzen Text; die App ruft `/api/vermittlung/` auf.

### Mit der Wrangler-CLI

```bash
git clone https://github.com/sebiweise/lagekit.git
cd lagekit
pnpm install
pnpm exec wrangler login
pnpm kurzcode:deploy
```

Zum Ausprobieren auf dem eigenen Rechner: `pnpm kurzcode:dev` startet den Worker unter `http://localhost:8787`.

### App auf den Dienst zeigen lassen

Die App muss wissen, wo der Dienst liegt. Bei der Installation, die ihn nutzen soll:

| Installation | Einstellung |
| --- | --- |
| Vercel | **Settings → Environment Variables:** `LAGEKIT_KURZCODE_DIENST` = `https://lagekit-kurzcode.<konto>.workers.dev`, danach neu deployen |
| Docker | `-e LAGEKIT_KURZCODE_DIENST=https://lagekit-kurzcode.<konto>.workers.dev` |
| Cloudflare Pages, eigener Build | dieselbe Variable beim Build |
| ZIP | `konfiguration.json` neben der `index.html`, siehe [Kurzcode-Dienst](kurzcode.md) |

Auf Vercel reicht die Variable auch die Anfragen an `/api/vermittlung/` weiter, falls dort kein Upstash verbunden ist. So funktionieren ältere Installationen, die noch die Vercel-Adresse ansprechen.

## App und Kurzcode

Der Worker liefert den statischen Export aus `out/` aus und beantwortet `/api/vermittlung/` und `/konfiguration.json` selbst. Statische Dateien kosten bei Cloudflare nichts und zählen nicht als Aufrufe.

1. Fork verbinden wie oben, aber mit diesen Einstellungen:

   | Einstellung | Wert |
   | --- | --- |
   | Project name | `lagekit` |
   | Build command | `pnpm build` |
   | Deploy command | `pnpm exec wrangler deploy` |

   Dazu `PNPM_VERSION` wie oben. Die Node.js-Version (26) kommt aus `.nvmrc`.
2. **Deploy**. Die App nutzt ohne weitere Einstellung den eigenen Dienst (`selbst`). Wer ihn abschalten will, setzt unter **Settings → Variables and Secrets** `LAGEKIT_KURZCODE_DIENST` auf `false`; das wirkt sofort, ohne neuen Build.
3. Optional unter **Settings → Domains & Routes** eine eigene Domain eintragen. Lagekit muss in der Wurzel der Domain liegen.

Mit der CLI: `pnpm build && pnpm exec wrangler deploy`.

Weiterleitungen alter Adressen (`_redirects`), Kopfzeilen für `sw.js` (`_headers`) und `404.html` wertet Cloudflare wie bei Pages aus.

## Kosten und Grenzen

Im Free-Plan gelten je Konto und Tag unter anderem:

| Grenze | Free-Plan | Verbrauch durch Lagekit |
| --- | --- | --- |
| Aufrufe von Workers | 100.000 | Der Host fragt nach neuen Beitrittsanfragen; der Worker hält die Abfrage bis zu 25 Sekunden offen und antwortet sofort, wenn eine kommt (Long-Polling). Das sind rund 150 Aufrufe je Host-Stunde, wartende Geräte ebenso, bis sie zugelassen sind. |
| Aufrufe von Durable Objects | 100.000 | einer je Aufruf des Workers |
| Laufzeit von Durable Objects | 13.000 GB-s | Ein einziges Objekt für alle Kurzcodes, durchgehend aktiv höchstens rund 11.000 GB-s am Tag, egal wie viele Abfragen warten |
| Geschriebene Zeilen | 100.000 | nur beim Anlegen, Anfragen und Antworten, nicht beim Nachfragen |

Damit reicht der Free-Plan für über 600 Host-Stunden am Tag, also sehr viele Übungen und Einsätze gleichzeitig. Ist eine Grenze erreicht, lehnt Cloudflare bis Mitternacht (UTC) ab; die App meldet dann „Kein Kurzcode“, QR-Code und Datei funktionieren weiter. Wer mehr braucht, wechselt auf den Workers-Paid-Plan (5 US-Dollar im Monat, 10 Millionen Aufrufe).

Den Verbrauch zeigt das Dashboard unter **Workers & Pages → lagekit-kurzcode → Metrics**.

## Datenschutz

Gespeichert werden nur Kurzcode, Beitrittsanfrage (Name, Funktion, Fahrzeug, Verbindungsdaten) und die Antwort des Hosts, höchstens 10 Minuten bzw. 12 Stunden für den Kurzcode selbst. Abgelaufenes löscht der Worker stündlich. Einsatzdaten laufen nie über den Dienst. Die Logs des Workers (`observability`) enthalten Aufrufe, aber keine Inhalte; wer keine Logs möchte, setzt `"observability": { "enabled": false }`.
