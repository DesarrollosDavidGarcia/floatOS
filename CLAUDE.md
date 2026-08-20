# FlotaOS — guía para Claude Code

SaaS de gestión operativa y fiscal para transportistas y flotillas pequeñas en México.
Despliegue **instancia-por-cliente**: un `docker-compose` independiente por cliente, **sin
multi-tenancy** — no existe `tenantId` y no debe introducirse. El sistema no mueve dinero de
las operaciones: registra, controla y da visibilidad/cumplimiento fiscal.

Idioma del proyecto: **español** en nombres de dominio, comentarios y mensajes de commit.

## Estructura

Monorepo con **npm workspaces** (no pnpm) en la raíz:

- `apps/api` — NestJS + Clean Architecture (`domain` / `application` / `infrastructure` / `presentation`), Prisma, PostgreSQL+PostGIS, Redis, Socket.io, BullMQ. Prefijo global `/api`, Swagger en `/api/docs`.
- `apps/web` — Next.js 14 App Router + TS + Tailwind + shadcn/ui + TanStack Query. Rutas en `src/app/(panel)/...`.
- `apps/mobile` — Flutter (app del conductor): `lib/features/{auth,viajes,tracking,chat}`.
- `packages/shared-types` — tipos compartidos API↔web (`Paginado<T>`, etc.).
- `infra/`, `nginx/`, `scripts/` — despliegue (ver `scripts/README.md`).

## Correr en local

Requiere **Node 20** (`nvm use 20.20.2`; la imagen Docker usa node:22-alpine).

```bash
docker compose up -d       # solo postgres/redis/minio (api/web/nginx están tras el perfil "full")
npm run dev:api            # API en :3000, prefijo /api
npm run dev:web            # Next en :3001
```

El `.env` de la raíz apunta a `localhost` (el `.env.example` usa hostnames de Docker). El web
lee `apps/web/.env.local`. Los scripts de Prisma cargan el `.env` de la raíz vía `dotenv-cli`.
Admin de desarrollo: `admin@flotaos.local` / `Admin1234!`.

Tests: `npm test` (api = jest, web = vitest). Lint: `npm run lint`. Formato: `npm run format`.

## Convenciones del backend — usar SIEMPRE los bloques compartidos

`apps/api/src/application/shared/`:

- `paginar()` + `normalizarPaginacion()` — **todos** los listados devuelven `Paginado<T>`; no paginar a mano.
- `obtenerOFallar(busqueda, mensaje)` — en vez de `if (!x) throw new NotFoundException(...)`.
- `asignarDefinidos(input, claves)` — construir el `data` de los `update` parciales.
- `fecha.util.ts` — fechas en UTC y cálculo de vencimientos.
- `token.util.ts`, `validar-archivo.ts` — tokens de links públicos y validación de subidas.

Otros:

- `PasswordService` (`infrastructure/shared`, `@Global` vía `SharedModule`) centraliza bcrypt; no llamar bcrypt directo.
- Autorización: `AdminGuard` + `@Roles(...)` (`presentation/http/auth/guards/`) para rutas del panel; `ConductorGuard`/comprobación de propiedad para la app del conductor. Roles: `ADMIN`, `MONITORISTA` (monitorista = solo lectura salvo viajes/tracking/lecturas).
- Use cases: una clase por caso de uso con método `execute()`, en `application/<modulo>/`.
- DTOs: fechas de entrada con `@IsDateString`; los `Actualizar*Dto` se derivan con `PartialType`.
- Errores: `AllExceptionsFilter` en `presentation/http/shared`.

## Convenciones del web

- Cliente HTTP en `@/lib/api` (axios con JWT + refresh automático); token en localStorage (`flotaos.accessToken`).
- Datos de servidor siempre por TanStack Query, no `fetch` suelto en componentes.
- Mapas: cargar los componentes de Leaflet con `dynamic(..., { ssr: false })`.

## Trampas verificadas (no re-descubrirlas)

- **`prisma generate` da EPERM** si la API en `--watch` sigue viva, y parar la tarea no mata el árbol: matar los `node.exe` de la API por PID antes de generar, luego relanzar.
- **`prisma migrate dev` falla con PostGIS** (`P3006 / type "geography" does not exist`): la extensión vive fuera de las migraciones y la shadow DB no la tiene. Para migraciones que no usen PostGIS: escribir el `migration.sql` a mano en `apps/api/prisma/migrations/<timestamp>_<nombre>/` y aplicarlo con `migrate deploy` (desde `apps/api`: `npx dotenv -e ../../.env -- npx prisma migrate deploy`), luego `npm run prisma:generate`.
- **Nada de `next dev --turbo`**: Turbopack rompe react-leaflet en SSR y devuelve 500 hasta en páginas sin mapa. El script `dev` usa webpack a propósito.
- No correr `next build` con el dev server vivo (corrompe `.next`), ni dos `nest start --watch` a la vez (EADDRINUSE en :3000).
- Si la API cae a Node 16 a media sesión (el symlink de nvm revierte) desaparece `fetch` global y el routing se degrada; verificar `node -v` del proceso.

## Seguimiento

`FlotaOS_MVP.md` es el documento vivo: checklist por fases + "Registro de avances" con fecha —
marcarlo al cerrar trabajo. Los informes `FlotaOS_Auditoria_*.md` guardan los hallazgos y su
estado. Trabajo por fases y con fan-out de subagentes cuando la tarea lo permita.
