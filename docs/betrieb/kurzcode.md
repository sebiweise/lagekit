# Kurzcode-Dienst

Beim gemeinsamen Arbeiten treten weitere Geräte einem Einsatz per QR-Code, Datei oder Kurzcode bei. QR-Code und Datei funktionieren immer ohne Server. Der Kurzcode braucht einen kleinen Vermittlungsdienst, über den Beitrittsanfrage und Antwort laufen: Name, Funktion, Fahrzeug und Verbindungsdaten, für höchstens 10 Minuten. Einsatzdaten laufen nie darüber; die App weist an der Stelle darauf hin. Wie der Beitritt technisch abläuft, steht unter [Gemeinsam arbeiten](../konzept/gemeinsam-arbeiten.md).

Installationen ohne eigenen Dienst (Vercel ohne Upstash, Docker ohne Compose, ZIP, Cloudflare Pages) nutzen standardmäßig den Dienst des Lagekit-Projekts unter `https://lagekit-kurzcode.sebiweise.workers.dev`.

## Wo der Dienst laufen kann

Die Logik ist überall dieselbe (`src/core/sync/vermittlung-dienst.ts`), nur der Speicher wechselt:

| Variante | Speicher | Kosten | Anleitung |
| --- | --- | --- | --- |
| Cloudflare Worker | Durable Object (SQLite) | Free-Plan reicht für die meisten | [Cloudflare Workers](cloudflare.md) |
| Docker Compose | Redis im Container daneben | eigener Server | [Docker](docker.md#mit-eigenem-kurzcode-dienst-und-redis) |
| Vercel-Funktion | Upstash Redis | Free-Tier von Upstash, wird bei häufiger Nutzung knapp | [Vercel](vercel.md#kurzcode-dienst) |

## Einstellen

Über die Umgebungsvariable `LAGEKIT_KURZCODE_DIENST`:

| Wert | Wirkung |
| --- | --- |
| `true` (Standard) | Dienst des Lagekit-Projekts |
| `false` | Kurzcode aus, Beitritt nur per QR-Code oder Datei |
| `https://lagekit-kurzcode.example.workers.dev` | eigener Dienst, z. B. ein eigener Cloudflare Worker oder eine andere Lagekit-Installation mit Dienst |
| `selbst` | Dienst derselben Installation unter `/api/vermittlung/` (Standard bei Vercel mit Upstash, Cloudflare Worker mit App, Docker Compose) |

- **Docker:** wird beim Start gelesen (`docker run -e LAGEKIT_KURZCODE_DIENST=false …`); das Image liefert den Wert als `/konfiguration.json` aus.
- **Cloudflare Worker mit App:** als Variable des Workers, wirkt sofort.
- **Eigener Build, Vercel, Cloudflare Pages:** beim Build gesetzt (`LAGEKIT_KURZCODE_DIENST=false pnpm build`).
- **ZIP ohne neuen Build:** neben die `index.html` eine Datei `konfiguration.json` legen:

  ```json
  { "kurzcodeDienst": "false" }
  ```

Welcher Dienst gilt, zeigt die App unter **Hinweise → Kurzcode**.
