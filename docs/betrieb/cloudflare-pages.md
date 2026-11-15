# Cloudflare Pages

Cloudflare Pages liefert statische Seiten kostenlos über das Netz von Cloudflare aus. Die mitgelieferten Dateien `_redirects` (Weiterleitung alter Adressen) und `_headers` (`sw.js` ohne Zwischenspeicher) wertet Pages von selbst aus; die Seite `404.html` nutzt Pages für unbekannte Adressen.

## Variante A: aus dem Repository bauen

1. Das Repository [sebiweise/lagekit](https://github.com/sebiweise/lagekit) auf GitHub forken.
2. Im Cloudflare-Dashboard **Workers & Pages → Create → Pages → Connect to Git** wählen und den Fork verbinden.
3. Build-Einstellungen:

   | Einstellung | Wert |
   | --- | --- |
   | Framework preset | None |
   | Build command | `pnpm build` |
   | Build output directory | `out` |

4. Unter **Environment variables** setzen:

   | Variable | Wert | Grund |
   | --- | --- | --- |
   | `PNPM_VERSION` | Version aus `packageManager` in `package.json`, z. B. `12.18.0` | Pages liest die pnpm-Version nicht aus dem Repository |
   | `LAGEKIT_KURZCODE_DIENST` | `true` oder `false` | optional, siehe unten |

   Die Node.js-Version (26) liest Pages aus der Datei `.nvmrc`.
5. **Save and Deploy**.

Neue Versionen kommen über **Sync fork** auf GitHub; Pages baut dann neu.

## Variante B: ZIP hochladen

1. `lagekit-<version>.zip` aus dem neuesten [Release](https://github.com/sebiweise/lagekit/releases) herunterladen und entpacken.
2. Im Dashboard **Workers & Pages → Create → Pages → Upload assets** wählen und den entpackten Ordner hochladen.

Oder mit der Wrangler-CLI:

```bash
npx wrangler pages deploy ./lagekit --project-name lagekit
```

Für ein Update den Inhalt des neuen ZIPs genauso hochladen.

## Kurzcode-Dienst

Pages führt die Vercel-Funktion des Vermittlungsdiensts nicht aus. Eine Pages-Installation nutzt deshalb standardmäßig den Dienst des Lagekit-Projekts (`LAGEKIT_KURZCODE_DIENST` nicht gesetzt oder `true`). Mit `false` ist der Kurzcode aus; beim ZIP geht das ohne neuen Build über eine Datei `konfiguration.json`, siehe [Kurzcode-Dienst](kurzcode.md).

## Eigene Domain

Unter **Custom domains** eine Domain oder Subdomain eintragen. Lagekit muss in der Wurzel der Domain liegen.
