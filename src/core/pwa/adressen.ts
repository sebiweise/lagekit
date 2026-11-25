/**
 * Adressen der App seit dem Umzug nach `/app/`.
 *
 * Bis Version 0.4 lag die App direkt unter `/` (z. B. `/einsatz/`). Lesezeichen,
 * installierte Apps (Startadresse `/`) und alte Links führen weiter in die App:
 * Hoster mit Weiterleitungen leiten schon auf dem Server um (`vercel.json`,
 * `docker/nginx.conf`, `public/_redirects`), überall sonst und offline die
 * 404-Seite per Skript (`ALTE_ADRESSE_SKRIPT`). Die Startseite `/` springt auf
 * Geräten, die die App schon nutzen, direkt in die App (`START_SKRIPT`).
 *
 * Alle Pfade hier gelten ohne Basispfad. Liegt die Installation in einem Unterordner
 * (`BASE_PATH`, z. B. `/lagekit` auf GitHub Pages), setzt `mitBasis()` ihn davor.
 * `next/link` und der Router tun das von selbst, alles andere nicht: Skripte,
 * `fetch`, `<img>`, `next/image`, Service Worker und Manifest.
 */

/**
 * `BASE_PATH` beim Build → Basispfad ohne Schrägstrich am Ende, leer für die Wurzel.
 * Wirft bei Werten, die kein einfacher Pfad sind, damit der Build scheitert.
 */
export function basisPfadAus(wert: string | undefined): string {
  let pfad = (wert ?? "").trim();
  if (pfad.endsWith("/")) pfad = pfad.slice(0, -1);
  if (pfad === "") return "";
  const segmente = pfad.split("/");
  if (segmente[0] !== "" || segmente.slice(1).some((s) => !/^[\w.~-]+$/.test(s) || s === "." || s === "..")) {
    throw new Error(`BASE_PATH: „${wert}“ ist kein Pfad wie /lagekit.`);
  }
  return pfad;
}

/** Basispfad dieser Installation, z. B. `/lagekit`; leer, wenn sie an der Wurzel liegt. */
export const BASIS_PFAD = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Setzt den Basispfad vor einen Pfad ab der Wurzel (`/sw.js`); alles andere bleibt. */
export function mitBasis(pfad: string): string {
  return pfad.startsWith("/") && !pfad.startsWith("//") ? BASIS_PFAD + pfad : pfad;
}

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
export const ALTE_ADRESSE_SKRIPT = `(function(){var b=${JSON.stringify(BASIS_PFAD)},p=location.pathname;if(b&&p.indexOf(b+"/")===0)p=p.slice(b.length);if(${ALT}.test(p)){document.documentElement.dataset.weiterleitung="";location.replace(b+"/app"+p+location.search+location.hash);}})();`;

/**
 * Läuft auf der Startseite vor allem anderen: Als App installiert (alte Installationen
 * starten noch unter `/`) oder auf einem Gerät, das die App schon nutzt, geht es direkt
 * in die App. `?ueber` zeigt die Startseite trotzdem.
 */
export const START_SKRIPT = `(function(){try{if(new URLSearchParams(location.search).has(${JSON.stringify(UEBER_PARAMETER)}))return;var d=document.documentElement;function weiter(){d.dataset.weiterleitung="";location.replace(${JSON.stringify(BASIS_PFAD + APP_PFAD)}+location.search+location.hash);}if(matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true||localStorage.getItem(${JSON.stringify(APP_GENUTZT_SCHLUESSEL)})){weiter();return;}if(indexedDB&&indexedDB.databases)indexedDB.databases().then(function(l){if(l.some(function(x){return x.name==="lagekit"}))weiter();},function(){});}catch(e){}})();`;
