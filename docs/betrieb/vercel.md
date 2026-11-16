# Vercel

Lagekit wird selbst auf Vercel betrieben (<https://lagekit.vercel.app>). Eine eigene Installation entsteht in wenigen Minuten aus einer Kopie (Fork) des Repositorys. Vercel baut bei jeder Änderung neu und bietet für jeden Pull Request eine Vorschau.

## Einrichten

1. Das Repository [sebiweise/lagekit](https://github.com/sebiweise/lagekit) auf GitHub forken.
2. In Vercel **Add New → Project** wählen und den Fork importieren.
3. Die Voreinstellungen übernehmen. `vercel.json` im Repository legt alles fest:
   - Framework „Other“ und Ausgabeordner `out` (nicht die Next.js-Laufzeit von Vercel, sonst fehlt der Service Worker),
   - Installation und Build mit pnpm,
   - Weiterleitung alter Adressen aus der Zeit vor `/app/`,
   - `sw.js` ohne Zwischenspeicher.
4. **Deploy** klicken. Node.js 26 nimmt Vercel aus `engines` in `package.json`.
5. Optional unter **Settings → Domains** eine eigene Domain eintragen.

## Kurzcode-Dienst

Ohne weitere Einstellung nutzt eine Vercel-Installation den Kurzcode-Dienst des Lagekit-Projekts. Für einen eigenen Dienst gibt es zwei Wege:

- **Cloudflare Worker (empfohlen, kostenlos):** einen eigenen Worker anlegen, siehe [Cloudflare Workers](cloudflare.md#nur-kurzcode-dienst), und unter **Settings → Environment Variables** `LAGEKIT_KURZCODE_DIENST` auf dessen Adresse setzen. Die Funktion `api/vermittlung.ts` reicht dann auch Anfragen an die Vercel-Adresse dorthin weiter.
- **Upstash Redis:** Im Projekt unter **Storage** (Marketplace) **Upstash Redis** verbinden und neu deployen. Die Funktion liest `KV_REST_API_URL` und `KV_REST_API_TOKEN` (oder `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`) und vermittelt selbst. Weil Host und wartende Geräte alle 2 Sekunden nachfragen, ist das Free-Tier von Upstash bei regelmäßiger Nutzung schnell verbraucht.

| `LAGEKIT_KURZCODE_DIENST` | Wirkung |
| --- | --- |
| nicht gesetzt | mit Upstash: eigener Dienst, sonst Dienst des Lagekit-Projekts |
| `https://…` | Dienst unter dieser Adresse, z. B. eigener Cloudflare Worker |
| `selbst` | eigener Dienst dieser Installation (braucht Upstash) |
| `true` | Dienst des Lagekit-Projekts |
| `false` | Kurzcode aus |

Die Variable wirkt beim Build, nach einer Änderung also neu deployen. Mehr unter [Kurzcode-Dienst](kurzcode.md).

## Updates

Neue Versionen kommen über **Sync fork** auf GitHub in den eigenen Fork; Vercel baut dann automatisch neu. Die Geräte aktivieren die neue Version erst nach Bestätigung.

## Ohne Git

Wer keinen Fork möchte, kann das ZIP eines Releases entpacken und mit der Vercel-CLI hochladen. Dann fehlen die Funktion für den Kurzcode-Dienst (die App nutzt den des Lagekit-Projekts) und die Weiterleitungen aus `vercel.json`; die Seite `404.html` leitet alte Adressen trotzdem weiter.

```bash
npx vercel deploy ./lagekit --prod
```
