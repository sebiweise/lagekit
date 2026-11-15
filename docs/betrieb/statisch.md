# Statisches Hosting (ZIP)

Jedes [Release](https://github.com/sebiweise/lagekit/releases) enthält `lagekit-<version>.zip` mit allen Dateien. Das ZIP wird in das Wurzelverzeichnis eines Webservers mit HTTPS entpackt, fertig. Geeignet ist jeder Webserver und jeder Webspace, der Dateien ausliefern kann.

## Installation

1. `lagekit-<version>.zip` aus dem neuesten Release herunterladen.
2. In das Wurzelverzeichnis der (Sub-)Domain entpacken, sodass `index.html`, `404.html` und `sw.js` direkt darin liegen.
3. Den Webserver wie unten beschrieben einstellen: `404.html` für unbekannte Adressen, `sw.js` ohne Zwischenspeicher.
4. `https://lagekit.example.de/app/` öffnen und auf der Startseite der App prüfen, dass „Offline bereit“ erscheint.

Für ein Update die alten Dateien durch den Inhalt des neuen ZIPs ersetzen. Alte Dateien zu löschen ist dabei sinnvoll, aber nicht nötig.

## nginx

```nginx
server {
    listen 443 ssl;
    server_name lagekit.example.de;
    root /var/www/lagekit;

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache";
    }
    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Alte Adressen aus der Zeit vor /app/ (bis Version 0.4)
    location ~ ^/(einsatz|tools|arbeitsbereich|export|hinweise|sitzung|suche|aenderungen)(/|$) {
        return 301 /app$request_uri;
    }

    location / {
        try_files $uri $uri/index.html $uri.html =404;
    }
    error_page 404 /404.html;
}
```

Eine vollständige Vorlage ist die Konfiguration des Docker-Images: [`docker/nginx.conf`](../../docker/nginx.conf).

## Apache

Eine `.htaccess` neben der `index.html` (braucht `mod_rewrite` und `mod_headers` sowie `AllowOverride All`):

```apache
ErrorDocument 404 /404.html

<Files "sw.js">
  Header set Cache-Control "no-cache"
</Files>
<Files "manifest.webmanifest">
  Header set Cache-Control "no-cache"
</Files>

RewriteEngine On
# Alte Adressen aus der Zeit vor /app/ (bis Version 0.4)
RewriteRule ^(einsatz|tools|arbeitsbereich|export|hinweise|sitzung|suche|aenderungen)(/.*)?$ /app/$1$2 [R=301,L]
```

Ordner wie `/app/einsatz/` liefert Apache von selbst als `index.html` aus.

## Caddy

```caddy
lagekit.example.de {
    root * /var/www/lagekit
    header /sw.js Cache-Control "no-cache"
    header /manifest.webmanifest Cache-Control "no-cache"
    @alt path_regexp alt ^/(einsatz|tools|arbeitsbereich|export|hinweise|sitzung|suche|aenderungen)(/.*)?$
    redir @alt /app{uri} 301
    file_server
    handle_errors {
        rewrite * /404.html
        file_server
    }
}
```

Caddy holt das Zertifikat selbst von Let's Encrypt.

## Andere Hoster

- **Netlify** liest die mitgelieferten Dateien `_redirects` und `_headers`; es ist nichts weiter einzustellen.
- **Cloudflare Pages:** siehe [Cloudflare Pages](cloudflare-pages.md).
- **GitHub Pages** funktioniert nur mit eigener Domain (sonst liegt die Seite in einem Unterordner). `404.html` wird dort automatisch genutzt.
- **IIS:** `404.html` als Fehlerseite für 404 eintragen und für `.webmanifest` den MIME-Typ `application/manifest+json` ergänzen.

Fehlen die Weiterleitungen, ist das nicht schlimm: Die Seite `404.html` leitet alte Adressen dann im Browser in die App weiter.

## Selbst bauen

Statt des ZIPs lässt sich der Inhalt auch selbst erzeugen. Voraussetzungen: Node.js 26 LTS und pnpm in der Version aus `package.json`.

```bash
git clone https://github.com/sebiweise/lagekit.git
cd lagekit
npm install -g pnpm@12
pnpm install
pnpm build    # Ergebnis in out/
```

Der Ordner `out/` entspricht dem Inhalt des ZIPs. Beim Build lässt sich der Kurzcode-Dienst festlegen, z. B. `LAGEKIT_KURZCODE_DIENST=false pnpm build`; siehe [Kurzcode-Dienst](kurzcode.md).
