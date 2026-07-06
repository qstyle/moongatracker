# Landing (apps/landing) — static Vite site served by nginx.
# Build context = repo ROOT (monorepo). In Dokploy set:
#   Build Type: Dockerfile
#   Dockerfile path: apps/landing/Dockerfile
#   Build context / root: . (repo root)
#   Build arg: VITE_APP_URL=https://tracker.moonga.ru  (where /register and /login live)

# --- build stage ---
FROM node:22-slim AS build
WORKDIR /app
# Workspace manifests first for install-layer caching (npm workspaces).
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/landing/package.json ./apps/landing/package.json
COPY apps/mcp/package.json ./apps/mcp/package.json
COPY libs/data-access/package.json ./libs/data-access/package.json
COPY libs/shared-types/package.json ./libs/shared-types/package.json
RUN npm install
COPY . .
# App base for the landing's «Начать»/«Войти» links (baked in at build time).
# Empty = same-domain relative paths.
ARG VITE_APP_URL=""
RUN VITE_APP_URL="$VITE_APP_URL" npx nx build landing

# --- runtime stage ---
FROM nginx:alpine AS run
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
