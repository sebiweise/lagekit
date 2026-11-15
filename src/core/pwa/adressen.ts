/**
 * Adressen der App seit dem Umzug nach `/app/`.
 *
 * Bis Version 0.4 lag die App direkt unter `/` (z. B. `/einsatz/`). Lesezeichen,
 * installierte Apps (Startadresse `/`) und alte Links führen weiter in die App:
 * Hoster mit Weiterleitungen leiten schon auf dem Server um (`vercel.json`,
 * `docker/nginx.conf`, `public/_redirects`), überall sonst und offline die
 * 404-Seite per Skript (`ALTE_ADRESSE_SKRIPT`). Die Startseite `/` springt auf
 * Geräten, die die App schon nutzen, direkt in die App (`START_SKRIPT`).
 */

/** Pfad der App. */
export const APP_PFAD = "/app/";

/** Erste Pfadsegmente der App vor dem Umzug; neue Seiten kommen hier nicht dazu. */
export const ALTE_BEREICHE = [
  "einsatz",
  "tools",
  "arbeitsbereich",
  "export",
  "hinweise",
  "sitzung",
  "suche",
  "aenderungen",
] as const;

/** Startseite trotz Weiterleitung zeigen, z. B. aus der App heraus: `/?ueber`. */
export const UEBER_PARAMETER = "ueber";

/** Schlüssel in localStorage: Auf diesem Gerät wurde die App schon geöffnet. */
export const APP_GENUTZT_SCHLUESSEL = "lagekit.app-genutzt";

const ALT = new RegExp(`^/(?:${ALTE_BEREICHE.join("|")})(?:/|$)`);

/** Neue Adresse für einen Pfad aus der Zeit vor `/app/`, sonst `null`. */
export function neuerPfad(pfad: string): string | null {
  return ALT.test(pfad) ? `/app${pfad}` : null;
}

/** Wie `neuerPfad`, aber lässt alles andere unverändert (z. B. gespeicherte Links). */
export function aktuellerPfad(pfad: string): string {
  return neuerPfad(pfad) ?? pfad;
}

/**
 * Läuft auf der 404-Seite vor allem anderen: alte Adressen gehen mit Suche und
 * Anker in die App, auch offline (der Service Worker liefert für unbekannte
 * Adressen die 404-Seite aus).
 */
export const ALTE_ADRESSE_SKRIPT = `(function(){var p=location.pathname;if(${ALT}.test(p)){document.documentElement.dataset.weiterleitung="";location.replace("/app"+p+location.search+location.hash);}})();`;

/**
 * Läuft auf der Startseite vor allem anderen: Als App installiert (alte Installationen
 * starten noch unter `/`) oder auf einem Gerät, das die App schon nutzt, geht es direkt
 * in die App. `?ueber` zeigt die Startseite trotzdem.
 */
export const START_SKRIPT = `(function(){try{if(new URLSearchParams(location.search).has(${JSON.stringify(UEBER_PARAMETER)}))return;var d=document.documentElement;function weiter(){d.dataset.weiterleitung="";location.replace(${JSON.stringify(APP_PFAD)}+location.search+location.hash);}if(matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true||localStorage.getItem(${JSON.stringify(APP_GENUTZT_SCHLUESSEL)})){weiter();return;}if(indexedDB&&indexedDB.databases)indexedDB.databases().then(function(l){if(l.some(function(x){return x.name==="lagekit"}))weiter();},function(){});}catch(e){}})();`;
