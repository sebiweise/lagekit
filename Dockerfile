# Lagekit als Container: statischer Export hinter nginx, ohne Root-Rechte.
#   docker run -p 8080:8080 ghcr.io/sebiweise/lagekit
# Für den Offline-Modus braucht der Browser HTTPS (oder localhost), z. B. über
# einen Reverse-Proxy davor. Siehe README, Abschnitt „Selbst betreiben“.

FROM node:26-alpine AS deps
WORKDIR /app
# pnpm in der Version aus package.json (packageManager); Corepack fehlt ab Node 25.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Ohne .git im Build-Kontext kommt der Commit als Argument (siehe scripts/build-info.mjs).
ARG LAGEKIT_COMMIT=unbekannt
ENV LAGEKIT_COMMIT=$LAGEKIT_COMMIT NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Kurzcode-Dienst als eigenes Image (ghcr.io/sebiweise/lagekit-vermittlung), gedacht
# für Docker Compose neben Redis: docker build --target vermittlung -t lagekit-vermittlung .
FROM deps AS vermittlung-build
COPY server ./server
COPY src/core/sync ./src/core/sync
# Ein einzelnes ES-Modul; der Banner gibt CommonJS-Teilen von redis ihr require().
RUN pnpm exec esbuild server/vermittlung.ts --bundle --minify --platform=node --format=esm \
    --target=node26 --outfile=/vermittlung/vermittlung.mjs \
    '--banner:js=import{createRequire}from"node:module";const require=createRequire(import.meta.url);'

FROM node:26-alpine AS vermittlung
ENV NODE_ENV=production PORT=8787
COPY --from=vermittlung-build /vermittlung /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8787/gesund || exit 1
CMD ["node", "/app/vermittlung.mjs"]

# Standard-Image: statischer Export hinter nginx (muss die letzte Stufe bleiben).
FROM nginxinc/nginx-unprivileged:stable-alpine
# Kurzcode für „Gemeinsam arbeiten“: true = gehosteter Dienst des Lagekit-Projekts,
# false = aus (nur QR-Code und Datei), selbst = Dienst neben dem Container (compose.yaml),
# oder Adresse einer eigenen Installation mit Dienst.
# LAGEKIT_VERMITTLUNG: Rechner und Port des Diensts für „selbst“.
# Wird beim Start gelesen, ein neuer Build ist nicht nötig.
ENV LAGEKIT_KURZCODE_DIENST=true \
    LAGEKIT_VERMITTLUNG=vermittlung:8787 \
    NGINX_ENVSUBST_FILTER=^LAGEKIT_
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
