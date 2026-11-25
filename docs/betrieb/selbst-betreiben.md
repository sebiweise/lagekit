# Lagekit selbst betreiben

Lagekit besteht nur aus statischen Dateien: HTML, JavaScript, CSS, Bilder und ein Service Worker. Es gibt keinen Anwendungsserver und keine Datenbank auf dem Server; alle Einsatzdaten bleiben im Browser der Geräte. Jeder Webserver, der Dateien mit HTTPS ausliefert, kann Lagekit betreiben.

## Welche Variante passt?

| Variante | Passt, wenn … | Anleitung |
| --- | --- | --- |
| Docker | ein Server oder NAS mit Docker vorhanden ist, z. B. im Gerätehaus oder Rechenzentrum; mit Compose auch mit eigenem Kurzcode-Dienst und Redis | [Docker](docker.md) |
| Statisches Hosting (ZIP) | schon ein Webserver läuft (nginx, Apache, Caddy, IIS) oder ein Webspace gebucht ist | [Statisches Hosting](statisch.md) |
| Vercel | eine eigene Installation ohne eigenen Server gewünscht ist | [Vercel](vercel.md) |
| Cloudflare Workers | eine eigene Installation ohne eigenen Server gewünscht ist, mit eigenem Kurzcode-Dienst, kostenlos | [Cloudflare Workers](cloudflare.md) |
| Cloudflare Pages | nur die statischen Dateien bei Cloudflare liegen sollen | [Cloudflare Pages](cloudflare-pages.md) |
| GitHub Pages | ein Fork auf GitHub genügen soll, ohne weiteres Konto | [GitHub Pages](github-pages.md) |

Wer nichts betreiben will, nutzt die gehostete Fassung unter <https://lagekit.vercel.app>. Auch dort bleiben alle Daten auf dem Gerät.

## Was jede Installation braucht

1. **HTTPS.** Browser starten den Service Worker und damit den Offline-Modus nur über HTTPS. Ausnahme ist `http://localhost` auf demselben Rechner.
2. **Eine eigene Adresse**, am besten in der Wurzel, z. B. `https://lagekit.example.de/`. Ein Unterordner wie `https://example.de/lagekit/` geht nur mit eigenem Build (`BASE_PATH=/lagekit pnpm build`, siehe [GitHub Pages](github-pages.md#basispfad)); das ZIP und das Docker-Image gehören in die Wurzel. Andere Anwendungen auf derselben Domain teilen sich mit Lagekit den Speicher im Browser.
3. **`sw.js` nicht zwischenspeichern.** Der Webserver sollte `/sw.js` mit `Cache-Control: no-cache` ausliefern, sonst kommen Updates erst Stunden später an. Dasselbe empfiehlt sich für `manifest.webmanifest`.
4. **`404.html` für unbekannte Adressen.** Der Webserver soll bei unbekannten Adressen die Datei `404.html` mit Status 404 ausliefern. Sie leitet auch alte Adressen in die App weiter (siehe unten).

Docker-Image, `vercel.json`, `wrangler.jsonc` und die Dateien `_redirects` und `_headers` für Cloudflare und Netlify bringen das alles schon mit. GitHub Pages kann keine Kopfzeilen setzen; warum es trotzdem geht, steht unter [GitHub Pages](github-pages.md#was-pages-nicht-kann).

## Adressen

Mit Basispfad (`BASE_PATH`) steht er vor jeder Adresse, z. B. `/lagekit/app/`.

| Adresse | Inhalt |
| --- | --- |
| `/` | Startseite mit Überblick und Links |
| `/app/` | die App selbst; installierte Apps starten hier |
| `/docs/` | diese Dokumentation |
| `/app/aenderungen/` | Änderungen der installierten und einer wartenden Version |
| `/sw.js` | Service Worker |
| `/konfiguration.json` | optional: Einstellungen zur Laufzeit, siehe [Kurzcode-Dienst](kurzcode.md) |

Geräte, auf denen die App schon genutzt wird, springen beim Aufruf von `/` direkt in die App, ebenso als App installierte Lagekit-Fassungen. Die Startseite ist dann über den Link „Über Lagekit“ in der App erreichbar (`/?ueber`).

### Alte Adressen (bis Version 0.4)

Bis Version 0.4 lag die App direkt in der Wurzel, z. B. `/einsatz/` oder `/tools/einsatztagebuch/`. Diese Adressen führen weiterhin in die App (`/app/einsatz/` usw.): Lesezeichen, installierte Apps und alte Links funktionieren also weiter.

- Docker, Vercel, Cloudflare Pages und Netlify leiten schon auf dem Server um (Status 301 bzw. 308).
- Auf allen anderen Webservern (auch GitHub Pages), und offline, leitet die Seite `404.html` im Browser um. Dafür muss der Webserver sie für unbekannte Adressen ausliefern.

Die gespeicherten Daten (Einsätze, Tagebuch, Einstellungen) liegen je Domain im Browser und sind vom Umzug nicht betroffen.

## Umzug auf eine neue Adresse

Der Browser speichert Einsätze, Tagebuch und Einstellungen je Adresse (Ursprung: Protokoll, Rechnername, Port). Eine neue Adresse, z. B. von `https://lagekit.vercel.app` nach `https://sebiweise.github.io/lagekit/`, beginnt deshalb leer, und eine installierte App bleibt an der alten Adresse. Die Daten kommen per Sicherung mit:

1. Eine laufende Sitzung „Gemeinsam arbeiten“ vorher beenden bzw. vollständig abgleichen: Änderungen, die ein Gast noch nicht an den Host gesendet hat, sind nicht in der Sicherung.
2. In der alten Installation unter **Einsatz → Sicherung und Gerätewechsel** auf **Alles sichern (JSON)** tippen. Die Datei enthält alle Einsätze mit allen Tool-Daten.
3. Die neue Adresse öffnen, bei Bedarf als App installieren, und dort unter **Einsatz** auf **Sicherung importieren** tippen. Vorhandene Daten werden ergänzt, nicht gelöscht.
4. Einstellungen, die nur auf dem Gerät liegen, neu setzen: verknüpfte Ordner (Dateien), Richtwerte der Strahlenexposition, Verfasser im Tagebuch, eigene Angaben für „Gemeinsam arbeiten“ (Name, Funktion, Fahrzeug), Mail-Empfänger, Aufteilung des Arbeitsbereichs, Farbschema und den aktiven Einsatz.
5. Erst wenn alles da ist, die alte App deinstallieren.

„Gemeinsam arbeiten“ ersetzt die Sicherung nicht: Eine Sitzung überträgt nur ihren einen Einsatz und keine Geräteeinstellungen.

Der Betreiber der alten Installation kann beim Build `LAGEKIT_UMZUG_URL` auf die neue Adresse setzen (z. B. `LAGEKIT_UMZUG_URL=https://sebiweise.github.io/lagekit/`). Nach dem nächsten Update zeigt die App dort einen Hinweis mit **Alles sichern** und **Neue Adresse öffnen**; „Später“ blendet ihn bis zum nächsten Start aus. Unter der neuen Adresse erscheint der Hinweis nicht.

Die alte Installation sollte danach noch eine Weile weiterlaufen, damit niemand Daten verliert. Wird sie später durch eine Weiterleitung auf die neue Adresse ersetzt, starten installierte Apps weiter aus ihrem Zwischenspeicher, samt Hinweis und Daten, bekommen aber keine Updates mehr.

## Updates

Eine neue Version wird einfach anstelle der alten Dateien ausgeliefert (neues Image, neues ZIP, neuer Build). Die Geräte laden sie im Hintergrund, aktivieren sie aber erst, wenn jemand auf „Jetzt aktualisieren“ tippt; vorher zeigt die App, was sich ändert. So wechselt die Version nie mitten im Einsatz.

Releases mit Änderungsliste, ZIP und Docker-Image stehen auf [GitHub](https://github.com/sebiweise/lagekit/releases).

## Kurzcode für „Gemeinsam arbeiten“

Mehrere Geräte können einem Einsatz per QR-Code, Datei oder Kurzcode beitreten. Nur der Kurzcode braucht einen kleinen Vermittlungsdienst. Standardmäßig nutzen eigene Installationen den Dienst des Lagekit-Projekts; wie man ihn abschaltet oder einen eigenen betreibt, steht unter [Kurzcode-Dienst](kurzcode.md).
