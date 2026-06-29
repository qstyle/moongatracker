# --- build stage ---
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
# Copy workspace manifests first so npm install can create workspace symlinks
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY libs/data-access/package.json ./libs/data-access/package.json
COPY libs/shared-types/package.json ./libs/shared-types/package.json
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx nx build api && npx nx build web

# --- runtime stage ---
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3020
ENV DATABASE_URL=file:/data/moongatracker.db
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
EXPOSE 3020
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/main.js"]
