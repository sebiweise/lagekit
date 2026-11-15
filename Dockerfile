# Lagekit als Container: statischer Export hinter nginx, ohne Root-Rechte.
#   docker run -p 8080:8080 ghcr.io/sebiweise/lagekit
# Für den Offline-Modus braucht der Browser HTTPS (oder localhost), z. B. über
# einen Reverse-Proxy davor. Siehe README, Abschnitt „Selbst betreiben“.

FROM node:26-alpine AS build
WORKDIR /app
# pnpm in der Version aus package.json (packageManager); Corepack fehlt ab Node 25.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile
COPY . .
# Ohne .git im Build-Kontext kommt der Commit als Argument (siehe scripts/build-info.mjs).
ARG LAGEKIT_COMMIT=unbekannt
ENV LAGEKIT_COMMIT=$LAGEKIT_COMMIT NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM nginxinc/nginx-unprivileged:stable-alpine
# Kurzcode für „Gemeinsam arbeiten“: true = gehosteter Dienst des Lagekit-Projekts,
# false = aus (nur QR-Code und Datei), oder Adresse einer eigenen Installation mit Dienst.
# Wird beim Start gelesen, ein neuer Build ist nicht nötig.
ENV LAGEKIT_KURZCODE_DIENST=true \
    NGINX_ENVSUBST_FILTER=^LAGEKIT_
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
