# Docker

Zu jedem [Release](https://github.com/sebiweise/lagekit/releases) gibt es ein fertiges Image für amd64 und arm64 (z. B. Raspberry Pi 4/5) in der GitHub Container Registry: `ghcr.io/sebiweise/lagekit`. Es liefert die statischen Dateien über nginx ohne Root-Rechte auf Port 8080 aus.

## Schnellstart

```bash
docker run -d --name lagekit -p 8080:8080 --restart unless-stopped ghcr.io/sebiweise/lagekit:latest
```

Danach läuft Lagekit unter `http://localhost:8080`. Auf demselben Rechner funktioniert damit auch der Offline-Modus. Für andere Geräte im Netz braucht es HTTPS, siehe [Reverse-Proxy](#reverse-proxy-mit-https).

## Tags

| Tag | Inhalt |
| --- | --- |
| `latest` | neuestes Release |
| `0.6.0` | genau diese Version |
| `0.6` | neuestes Release dieser Minor-Version (nur Fehlerbehebungen) |

Für den Einsatz empfiehlt sich eine feste Version oder `Major.Minor`, damit Updates bewusst passieren.

## Docker Compose

```yaml
services:
  lagekit:
    image: ghcr.io/sebiweise/lagekit:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      # true = Kurzcode über den Dienst des Lagekit-Projekts, false = aus
      LAGEKIT_KURZCODE_DIENST: "true"
```

## Mit eigenem Kurzcode-Dienst und Redis

Wer den Kurzcode nicht über den Dienst des Lagekit-Projekts laufen lassen will, etwa in einem Netz ohne Internet, betreibt ihn selbst. Die Datei [`compose.yaml`](../../compose.yaml) im Repository startet drei Container:

| Container | Image | Aufgabe |
| --- | --- | --- |
| `lagekit` | `ghcr.io/sebiweise/lagekit` | App über nginx, reicht `/api/vermittlung/` an den Dienst weiter |
| `vermittlung` | `ghcr.io/sebiweise/lagekit-vermittlung` | Kurzcode-Dienst (Node.js) |
| `redis` | `redis:8-alpine` | Speicher für Kurzcodes und Beitrittsanfragen |

```bash
curl -O https://raw.githubusercontent.com/sebiweise/lagekit/master/compose.yaml
docker compose up -d
```

Die App ruft den Dienst unter ihrer eigenen Adresse auf (`LAGEKIT_KURZCODE_DIENST=selbst`), also auch durch einen Reverse-Proxy davor. Redis ist von außen nicht erreichbar. Ohne `REDIS_URL` hält der Dienst die Kurzcodes im Arbeitsspeicher; das geht auch, nur sind laufende Beitritte nach einem Neustart weg.

Einstellungen des Diensts:

| Variable | Container | Standard | Wirkung |
| --- | --- | --- | --- |
| `LAGEKIT_VERMITTLUNG` | `lagekit` | `vermittlung:8787` | Rechner und Port des Diensts, an den nginx weiterreicht |
| `REDIS_URL` | `vermittlung` | nicht gesetzt | z. B. `redis://redis:6379`, auch Valkey oder ein Redis mit Passwort (`redis://:passwort@rechner:6379`) |
| `PORT` | `vermittlung` | `8787` | Port des Diensts |

Selbst bauen statt das Image zu laden: `docker build --target vermittlung -t lagekit-vermittlung .`

## Reverse-Proxy mit HTTPS

Der Container selbst spricht nur HTTP. Davor gehört ein Reverse-Proxy mit Zertifikat, zum Beispiel Caddy, das Zertifikate selbst von Let's Encrypt holt:

```yaml
services:
  lagekit:
    image: ghcr.io/sebiweise/lagekit:latest
    restart: unless-stopped
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    command: caddy reverse-proxy --from lagekit.example.de --to lagekit:8080
    volumes:
      - caddy-daten:/data
volumes:
  caddy-daten:
```

Mit Traefik reichen die üblichen Labels am Container:

```yaml
    labels:
      - traefik.http.routers.lagekit.rule=Host(`lagekit.example.de`)
      - traefik.http.services.lagekit.loadbalancer.server.port=8080
```

Ohne Internetzugang (z. B. reines Netz im ELW) braucht der Proxy ein Zertifikat aus einer eigenen Zertifizierungsstelle, der die Geräte vertrauen.

Wichtig: Lagekit muss in der Wurzel der Adresse liegen (`https://lagekit.example.de/`), nicht unter einem Pfad wie `/lagekit/`.

## Einstellungen

| Variable | Standard | Wirkung |
| --- | --- | --- |
| `LAGEKIT_KURZCODE_DIENST` | `true` | Kurzcode für „Gemeinsam arbeiten“, siehe [Kurzcode-Dienst](kurzcode.md); `selbst` mit eigenem Dienst daneben |
| `LAGEKIT_VERMITTLUNG` | `vermittlung:8787` | Rechner und Port des eigenen Diensts, siehe [oben](#mit-eigenem-kurzcode-dienst-und-redis) |

Die Einstellung wird beim Start gelesen; ein neuer Build ist nicht nötig.

## Update

```bash
docker pull ghcr.io/sebiweise/lagekit:latest
docker rm -f lagekit
docker run -d --name lagekit -p 8080:8080 --restart unless-stopped ghcr.io/sebiweise/lagekit:latest
```

Mit Compose: `docker compose pull && docker compose up -d` (holt auch den neuen Kurzcode-Dienst). Die Geräte aktivieren die neue Version erst nach Bestätigung.

## Was das Image mitbringt

- Weiterleitung alter Adressen aus der Zeit vor `/app/` (bis Version 0.4)
- `sw.js` und `manifest.webmanifest` ohne Zwischenspeicher, Dateien mit Hash im Namen ein Jahr lang
- `404.html` für unbekannte Adressen, Healthcheck auf `/`
- Weiterleitung von `/api/vermittlung/` an einen eigenen Kurzcode-Dienst (nur mit `selbst` genutzt)

Die Konfiguration steht in [`docker/nginx.conf`](../../docker/nginx.conf).

## Selbst bauen

```bash
git clone https://github.com/sebiweise/lagekit.git
cd lagekit
docker build -t lagekit .
docker run -p 8080:8080 lagekit
```
