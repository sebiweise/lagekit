# GitHub Pages

GitHub Pages liefert statische Seiten kostenlos aus, direkt aus dem Repository. Lagekit läuft dort als Projektseite in einem Unterordner, z. B. `https://<konto>.github.io/lagekit/`. Den Build übernimmt der Workflow `.github/workflows/pages.yml`.

## Einrichten

1. Das Repository [sebiweise/lagekit](https://github.com/sebiweise/lagekit) auf GitHub forken.
2. Im Fork unter **Settings → Pages** bei **Source** „GitHub Actions“ wählen.
3. Unter **Actions** den Workflow „GitHub Pages“ starten (**Run workflow**). Danach läuft er bei jeder Änderung auf `master` von selbst.
4. `https://<konto>.github.io/<repository>/app/` öffnen und prüfen, dass „Offline bereit“ erscheint.

Der Workflow baut mit `BASE_PATH=/<repository>`, legt eine leere Datei `.nojekyll` in `out/` (sonst lässt Pages Ordner wie `_next/` weg) und veröffentlicht `out/`. Neue Versionen kommen über **Sync fork**; die Geräte aktivieren sie erst nach Bestätigung.

## Basispfad

Next.js, Service Worker (Adresse und Geltungsbereich), Web-App-Manifest, Weiterleitung alter Adressen, Bilder und die Links der Dokumentation richten sich nach `BASE_PATH`. Lokal prüfen:

```bash
BASE_PATH=/lagekit pnpm build
BASE_PATH=/lagekit pnpm start      # http://localhost:3000/lagekit/
BASE_PATH=/lagekit pnpm test:e2e   # Playwright unter /lagekit/
```

In Git Bash unter Windows davor `MSYS_NO_PATHCONV=1` setzen, sonst wird aus `/lagekit` ein Windows-Pfad.

Mit einer eigenen Domain (**Settings → Pages → Custom domain**) liegt Lagekit wieder in der Wurzel. Dann im Workflow die Zeile `BASE_PATH` entfernen.

## Was Pages nicht kann

Pages setzt keine eigenen Kopfzeilen und kennt weder Weiterleitungen noch Funktionen. `vercel.json`, `_headers` und `_redirects` wirken dort nicht.

| Fehlt auf Pages | Folge | Warum das reicht |
| --- | --- | --- |
| `Cache-Control: no-cache` für `sw.js` und `manifest.webmanifest` | Pages liefert alle Dateien mit `max-age=600` aus. | Browser prüfen `sw.js` beim Update am HTTP-Zwischenspeicher vorbei (Standard `updateViaCache: "imports"`), und der Service Worker lädt geänderte Dateien mit `cache: "reload"` neu. Ein geändertes Manifest (Name, Symbole) kommt höchstens 10 Minuten später an. |
| `immutable` für `/_next/static/` | Vor dem ersten Start des Service Workers fragt der Browser nach 10 Minuten nach, ob sich Dateien geändert haben (Antwort 304). | Danach kommt alles aus dem Precache des Service Workers. |
| Weiterleitung alter Adressen (301) | Alte Adressen aus der Zeit vor `/app/` antworten mit 404. | Die Seite `404.html` leitet sie im Browser weiter, auch offline. Nur Suchmaschinen und Aufrufe ohne JavaScript sehen den Status 404. |
| `Service-Worker-Allowed` | keine | `sw.js` liegt im Basispfad und deckt genau ihn ab. |
| `/api/vermittlung/` | Kein eigener Kurzcode-Dienst (`LAGEKIT_KURZCODE_DIENST=selbst` geht nicht). | Der Workflow nutzt den Dienst des Lagekit-Projekts (Cloudflare Worker), siehe [Kurzcode-Dienst](kurzcode.md). Ein eigener Worker geht über die Adresse in `LAGEKIT_KURZCODE_DIENST`. |

## Neue Adresse heißt neue Daten

Daten liegen je Adresse (Ursprung, also Protokoll, Rechnername und Port) im Browser. Wer von einer anderen Installation, etwa `https://lagekit.vercel.app`, nach GitHub Pages wechselt, findet dort zunächst keine Einsätze. Wie die Daten mitkommen, steht unter [Umzug auf eine neue Adresse](selbst-betreiben.md#umzug-auf-eine-neue-adresse).
