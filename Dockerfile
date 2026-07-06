# --- build stage ---
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
# Copy workspace manifests first so npm install can create workspace symlinks
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/landing/package.json ./apps/landing/package.json
COPY libs/data-access/package.json ./libs/data-access/package.json
COPY libs/shared-types/package.json ./libs/shared-types/package.json
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx nx build api && npx nx build web && npx nx build landing

# --- runtime stage ---
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
# Site (api + web) port and landing port. One image, two ports.
ENV PORT=3020
ENV LANDING_PORT=8080
# APP_URL — where the landing's «Начать/Войти» point (the site domain). Set at
# runtime (e.g. https://tracker.moonga.ru). Empty → relative links.
ENV APP_URL=""
# DATABASE_URL is provided at runtime (points at the postgres server)
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/landing/dist ./apps/landing/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
EXPOSE 3020 8080
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node apps/api/dist/main.js"]
