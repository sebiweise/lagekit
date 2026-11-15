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

Auf Vercel läuft neben den statischen Dateien die Funktion `api/vermittlung.ts`, der Vermittlungsdienst für den Kurzcode. Standardmäßig nutzt eine Vercel-Installation ihren eigenen Dienst. Dafür braucht er einen Speicher:

1. Im Projekt unter **Storage** (Marketplace) **Upstash Redis** hinzufügen und mit dem Projekt verbinden.
2. Neu deployen. Die Funktion liest `KV_REST_API_URL` und `KV_REST_API_TOKEN` (oder `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`).

Ohne Upstash meldet die App „Kein Kurzcode“; QR-Code und Datei funktionieren trotzdem. Alternativ unter **Settings → Environment Variables** `LAGEKIT_KURZCODE_DIENST` setzen:

| Wert | Wirkung |
| --- | --- |
| nicht gesetzt | eigener Dienst dieser Installation (braucht Upstash) |
| `true` | Dienst des Lagekit-Projekts |
| `false` | Kurzcode aus |

Die Variable wirkt beim Build, nach einer Änderung also neu deployen. Mehr unter [Kurzcode-Dienst](kurzcode.md).

## Updates

Neue Versionen kommen über **Sync fork** auf GitHub in den eigenen Fork; Vercel baut dann automatisch neu. Die Geräte aktivieren die neue Version erst nach Bestätigung.

## Ohne Git

Wer keinen Fork möchte, kann das ZIP eines Releases entpacken und mit der Vercel-CLI hochladen. Dann fehlen der Kurzcode-Dienst und die Weiterleitungen aus `vercel.json`; die Seite `404.html` leitet alte Adressen trotzdem weiter.

```bash
npx vercel deploy ./lagekit --prod
```
