# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build --workspace @flotaos/shared-types
RUN npm run build --workspace @flotaos/web

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install --omit=dev

COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3001
WORKDIR /repo/apps/web
CMD ["npm", "run", "start"]
