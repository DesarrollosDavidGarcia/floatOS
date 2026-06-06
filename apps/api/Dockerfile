# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /repo

# Toolchain nativo: bcrypt se compila desde fuente en Alpine (musl no trae
# prebuild). El build stage se descarta, así que no importa el peso.
RUN apk add --no-cache python3 make g++

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
# build-base/python3 para compilar bcrypt (nativo) en musl; se instalan y
# eliminan en la misma capa para no engordar la imagen final.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && npm install --omit=dev \
 && apk del .build-deps

COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma ./node_modules/@prisma
# CLI de prisma (devDependency, no entra con --omit=dev) necesario para
# `migrate deploy` al arrancar. Solo depende de @prisma/* (ya copiado), así que
# copiar el paquete + su bin basta y evita descargarlo de la red en cada boot.
COPY --from=build /repo/node_modules/prisma ./node_modules/prisma
COPY --from=build /repo/node_modules/.bin/prisma ./node_modules/.bin/prisma

EXPOSE 3000
WORKDIR /repo/apps/api
# Al arrancar: aplica migraciones pendientes (estricto: si falla, no levanta) y
# siembra/actualiza los catálogos (tolerante: un fallo no tumba el API, son
# idempotentes y la DB ya está migrada).
CMD ["sh", "-c", "npx prisma migrate deploy && (node prisma/seed-catalogos.mjs || echo 'WARN: seed de catalogos fallo, continuo') && node dist/main.js"]
