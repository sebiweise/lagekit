# Kurzcode-Dienst

Beim gemeinsamen Arbeiten treten weitere Geräte einem Einsatz per QR-Code, Datei oder Kurzcode bei. QR-Code und Datei funktionieren immer ohne Server. Der Kurzcode braucht einen kleinen Vermittlungsdienst (`api/vermittlung.ts`, Vercel-Funktion mit Upstash Redis), über den Beitrittsanfrage und Antwort laufen: Name, Funktion, Fahrzeug und Verbindungsdaten, für höchstens 10 Minuten. Einsatzdaten laufen nie darüber; die App weist an der Stelle darauf hin. Wie der Beitritt technisch abläuft, steht unter [Gemeinsam arbeiten](../konzept/gemeinsam-arbeiten.md).

Statische Installationen ohne eigenen Server (Docker, ZIP, Cloudflare Pages) nutzen standardmäßig den Dienst des Lagekit-Projekts unter `https://lagekit.vercel.app`.

## Einstellen

Über die Umgebungsvariable `LAGEKIT_KURZCODE_DIENST`:

| Wert | Wirkung |
| --- | --- |
| `true` (Standard) | Dienst des Lagekit-Projekts |
| `false` | Kurzcode aus, Beitritt nur per QR-Code oder Datei |
| `https://lagekit.example.de` | Dienst einer eigenen Lagekit-Installation auf Vercel (mit Upstash) |
| `selbst` | Dienst derselben Installation unter `/api/vermittlung/` (Standard bei Builds auf Vercel) |

- **Docker:** wird beim Start gelesen (`docker run -e LAGEKIT_KURZCODE_DIENST=false …`); das Image liefert den Wert als `/konfiguration.json` aus.
- **Eigener Build, Vercel, Cloudflare Pages:** beim Build gesetzt (`LAGEKIT_KURZCODE_DIENST=false pnpm build`).
- **ZIP ohne neuen Build:** neben die `index.html` eine Datei `konfiguration.json` legen:

  ```json
  { "kurzcodeDienst": "false" }
  ```

Welcher Dienst gilt, zeigt die App unter **Hinweise → Kurzcode**.

## Eigenen Dienst betreiben

Eine eigene Installation auf Vercel mit Upstash Redis bringt den Dienst mit, siehe [Vercel](vercel.md). Andere Installationen nutzen ihn dann mit `LAGEKIT_KURZCODE_DIENST=https://<adresse-der-vercel-installation>`.
