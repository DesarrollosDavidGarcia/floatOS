# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /repo

# Manifiestos para aprovechar la cache de capas
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm install

# Código fuente
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN npm run build --workspace @flotaos/shared-types
RUN npm run prisma:generate --workspace @flotaos/api
RUN npm run build --workspace @flotaos/api

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install --omit=dev

COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
WORKDIR /repo/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
