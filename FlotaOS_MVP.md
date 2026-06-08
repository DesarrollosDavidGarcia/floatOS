# FlotaOS — Documento MVP

> SaaS para transportistas independientes y flotillas pequeñas · Mercado México · v1.0

---

## Contexto del producto

FlotaOS es un SaaS de gestión operativa y fiscal para transportistas independientes y flotillas pequeñas en México. El modelo de negocio **no maneja dinero de las operaciones** — el flujo financiero ocurre directamente entre las partes (cliente y transportista). La plataforma provee registro, control, visibilidad y cumplimiento fiscal, no intermediación de pagos.

---

## Modelo de negocio

- **Precio:** suscripción mensual fija por cliente
- **Cobranza:** gestionada por el proveedor (tú) fuera de la plataforma
- **Activación:** al confirmar pago, se levanta una nueva instancia Docker para el cliente
- **Suspensión:** al caer el pago, se detiene la instancia (`docker compose stop`)
- **Backup:** cada instancia es independiente — se puede respaldar, clonar y restaurar de forma individual con `pg_dump`

---

## Modelo de despliegue — instancia por cliente

**No se usa multi-tenancy.** Cada cliente es una instalación Docker completamente independiente con su propia base de datos, su propio MinIO y su propia API. Tú como proveedor administras las instancias.

### Ventajas para el MVP

- Sin complejidad de `tenantId` en el schema — el schema Prisma es más simple y limpio
- Aislamiento total de datos entre clientes sin riesgo de filtración
- Backup y restauración trivial por cliente (`pg_dump` / `pg_restore`)
- Si un cliente deja de pagar: `docker compose stop` en su instancia
- Nuevo cliente: clonar el `docker-compose.yml`, cambiar puertos y variables, `docker compose up -d`
- Escalable sin refactoring — si en el futuro se decide migrar a multi-tenancy, el schema ya estará limpio para hacerlo

### Flujo de alta de un cliente nuevo

```
1. Cliente confirma pago mensual
2. Copiar plantilla de instancia → carpeta del cliente
3. Configurar .env (puertos, credenciales, nombre)
4. docker compose up -d
5. npx prisma migrate deploy  (crea el schema en la BD nueva)
6. Crear usuario admin inicial (seed)
7. Entregar credenciales al cliente
```

---

## Usuarios y seguridad (MVP)

- **Un solo usuario admin por instancia** — el dueño de la flotilla
- **Conductores** tienen su propio acceso a la app Flutter (credenciales separadas)
- **Autenticación:** JWT + refresh tokens
- **Sin roles ni permisos por el momento** — todo el panel web es accesible para el admin. Se agrega control de acceso en Fase 2 cuando haya feedback real de usuarios
- **Seguridad básica:** HTTPS vía Nginx, passwords hasheados con bcrypt, JWT firmado con secret en `.env`

---

## Stack tecnológico

> **Principio:** se priorizan herramientas **open-source y gratuitas** en todos los niveles. Toda excepción está documentada y justificada.

| Capa | Tecnología | Licencia |
|---|---|---|
| Backend | NestJS (Node.js + TypeScript) | MIT |
| ORM | Prisma | Apache 2.0 |
| Base de datos | PostgreSQL + PostGIS | PostgreSQL License |
| Cache / colas | Redis (Community Edition) | BSD-3 |
| Tiempo real | Socket.io (self-hosted) | MIT |
| Jobs / alertas | BullMQ + Redis | MIT |
| Panel web | Next.js (App Router) + TypeScript | MIT |
| UI components | shadcn/ui + Tailwind CSS | MIT |
| Estado servidor | TanStack Query | MIT |
| App conductores | Flutter (Android + iOS) | BSD-3 |
| Mapas (web) | Leaflet.js + OpenStreetMap | BSD-2 / ODbL |
| Mapas (app) | flutter_map + OpenStreetMap tiles | MIT / ODbL |
| GPS background | `geolocator` + `flutter_background_service` | MIT |
| Notificaciones app | Socket.io (mismo canal tiempo real) | MIT |
| Email | Nodemailer + SMTP propio | MIT |
| Almacenamiento archivos | MinIO (self-hosted, compatible S3) | AGPL-3.0 |
| Fiscal (Carta Porte) | PAC vía REST API — obligatorio SAT | Costo por timbre ⚠️ |
| Contenerización | Docker + Docker Compose | Apache 2.0 |
| Proxy / SSL | Nginx (reverse proxy, TLS) | BSD-2 |
| Infra | VPS con Docker (Hetzner, DigitalOcean) o on-premise | — |

### Excepción justificada

**PAC para Carta Porte / CFDI 4.0:** El SAT exige timbrado por un Proveedor Autorizado de Certificación registrado. No existe alternativa open-source válida. El costo es por timbre y lo absorbe el cliente final, no la operación del SaaS. Opciones: Facturama, SW Sapien o Finkok.

> **Push notifications (FCM) descartado del MVP:** el conductor tiene la app activa durante su jornada — Socket.io cubre la comunicación en tiempo real sin servicio externo. FCM se evalúa en Fase 3 si el feedback lo justifica.

### Sustituciones open-source

- **Google Maps** → Leaflet + OpenStreetMap (web) y `flutter_map` (app). Sin API key de pago.
- **Pusher / Ably** → Socket.io self-hosted dentro del mismo contenedor del backend.
- **AWS S3 / Azure Blob** → MinIO self-hosted en Docker. API compatible con S3.
- **Twilio / Vonage** → WhatsApp Business API directo (Meta), tier gratuito 1,000 conversaciones/mes.
- **Hangfire Pro** → BullMQ sobre Redis (MIT).

---

## Arquitectura — Clean Architecture en Monorepo

El proyecto vive en **un solo repositorio Git** con tres aplicaciones y paquetes compartidos. La API sigue **Clean Architecture** — las capas internas no conocen las externas.

### Estructura del monorepo

```
flotaos/
├── apps/
│   ├── api/                        # NestJS — backend (Clean Architecture)
│   │   └── src/
│   │       ├── domain/             # Entidades, enums, interfaces de repositorio
│   │       │   ├── viaje/
│   │       │   ├── conductor/
│   │       │   ├── unidad/
│   │       │   └── ...
│   │       ├── application/        # Casos de uso, DTOs, servicios de aplicación
│   │       │   ├── viaje/
│   │       │   │   ├── crear-viaje.usecase.ts
│   │       │   │   ├── cambiar-estado-viaje.usecase.ts
│   │       │   │   └── ...
│   │       │   └── ...
│   │       ├── infrastructure/     # Prisma, MinIO, Socket.io, PAC, BullMQ
│   │       │   ├── database/
│   │       │   │   ├── prisma.service.ts
│   │       │   │   └── schema.prisma
│   │       │   ├── storage/        # MinIO
│   │       │   ├── realtime/       # Socket.io gateway
│   │       │   ├── queues/         # BullMQ jobs
│   │       │   └── pac/            # Integración PAC Carta Porte
│   │       └── presentation/       # Controllers HTTP, WebSocket gateways
│   │           ├── http/
│   │           └── ws/
│   │
│   ├── web/                        # Next.js — panel admin / monitorista
│   │   └── src/
│   │       ├── app/                # App Router (páginas)
│   │       ├── components/         # Componentes UI (shadcn/ui)
│   │       ├── lib/                # TanStack Query, axios, socket client
│   │       └── hooks/
│   │
│   └── mobile/                     # Flutter — app conductores
│       └── lib/
│           ├── features/
│           │   ├── auth/
│           │   ├── viajes/
│           │   ├── tracking/
│           │   └── gastos/
│           ├── core/               # HTTP client, socket, storage local
│           └── shared/             # Widgets comunes
│
├── packages/
│   └── shared-types/               # DTOs TypeScript compartidos (api ↔ web)
│       └── src/
│           ├── viaje.dto.ts
│           ├── conductor.dto.ts
│           └── ...
│
├── docker-compose.yml              # Producción
├── docker-compose.override.yml     # Desarrollo (hot reload)
├── .env.example
└── nginx/
    ├── nginx.conf
    └── certs/
```

### Por qué Clean Architecture en NestJS

La capa `domain` no importa nada de NestJS, Prisma ni Express — solo TypeScript puro. Esto permite:
- Cambiar Prisma por otro ORM sin tocar los casos de uso
- Testear la lógica de negocio sin levantar la base de datos
- Escalar el equipo sin que todos necesiten conocer la infraestructura completa

---

## Infraestructura Docker

Cada instancia de cliente = un `docker compose` independiente. Tú administras N instancias en el mismo VPS o en VPS separados.

### Servicios por instancia

| Servicio | Imagen | Puerto interno |
|---|---|---|
| `api` | `node:22-alpine` (NestJS) | 3000 |
| `web` | `node:22-alpine` (Next.js) | 3001 |
| `postgres` | `postgis/postgis:16-3.4` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |
| `minio` | `minio/minio:latest` | 9000 / 9001 |
| `nginx` | `nginx:alpine` | 80 / 443 |

> La app Flutter se distribuye como APK/IPA instalable — no corre en Docker.

### `docker-compose.yml` (referencia)

```yaml
services:

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - api
      - web
    restart: unless-stopped

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=${NODE_ENV}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - PAC_API_URL=${PAC_API_URL}
      - PAC_API_KEY=${PAC_API_KEY}
    depends_on:
      - postgres
      - redis
      - minio
    restart: unless-stopped

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=${NODE_ENV}
      - NEXT_PUBLIC_API_URL=${API_URL}
    depends_on:
      - api
    restart: unless-stopped

  postgres:
    image: postgis/postgis:16-3.4
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### `.env.example`

```env
NODE_ENV=production
API_URL=https://api.cliente.tudominio.com

POSTGRES_DB=flotaos
POSTGRES_USER=flotaos_user
POSTGRES_PASSWORD=CAMBIAR_EN_PRODUCCION
DATABASE_URL=postgresql://flotaos_user:CAMBIAR_EN_PRODUCCION@postgres:5432/flotaos

REDIS_URL=redis://redis:6379

JWT_SECRET=CAMBIAR_MIN_32_CARACTERES

MINIO_ACCESS_KEY=CAMBIAR_EN_PRODUCCION
MINIO_SECRET_KEY=CAMBIAR_EN_PRODUCCION

PAC_API_URL=https://api.facturama.mx
PAC_API_KEY=CLAVE_PAC

WHATSAPP_TOKEN=TOKEN_META
WHATSAPP_PHONE_ID=ID_NUMERO
```

### Modelo de actualización — build central + registry + pull

Las imágenes `api` y `web` se **construyen una sola vez** (tu máquina o CI), se
etiquetan con la versión (= git tag) y se publican a un **registry**. Cada
instancia de cliente solo hace `docker compose pull` — no compila nada en el
VPS. Así todos los clientes corren el mismo binario y actualizar es rápido y
reversible. La imagen del panel hornea la URL de API/WS como **ruta relativa**,
por lo que **una sola imagen sirve a todos los clientes** sin recompilar.

`docker-compose.yml` referencia `${IMAGE_REGISTRY}/flotaos-{api,web}:${FLOTAOS_VERSION}`;
`docker-compose.build.yml` (overlay, solo en la máquina de build) agrega el
contexto de build. Los scripts viven en `scripts/` (detalle en `scripts/README.md`).

### Comandos de operación

```bash
# Publicar una versión nueva (tu máquina / CI)
git tag v1.1.0
./scripts/build-publicar.sh 1.1.0 --push

# Alta de cliente nuevo (VPS) — secretos aleatorios + migración + seed + admin
./scripts/alta-cliente.sh empresa-xyz 1.1.0

# Actualizar (VPS) — backup -> pull -> recrea api/web -> verifica /api/health
./scripts/actualizar-cliente.sh clientes/empresa-xyz 1.1.0   # una
./scripts/actualizar-todos.sh 1.1.0                          # todas

# Operación diaria
cd clientes/empresa-xyz
docker compose logs -f api             # ver logs
docker compose restart api             # reiniciar servicio

# Backup / restaurar base de datos
docker compose exec -T postgres pg_dump -U flotaos_user flotaos > backups/backup-$(date +%F).sql
docker compose exec -T postgres psql  -U flotaos_user flotaos < backups/backup-2026-06-06.sql

# Suspender (pago caído) / reactivar
docker compose stop
docker compose start
```

> El usuario admin inicial se crea con `prisma/seed-admin.mjs` (Node plano, corre
> dentro de la imagen de producción); las migraciones y el **seed de catálogos**
> se aplican solos al arrancar el API (idempotentes).

### Consideraciones de producción

- Datos de PostgreSQL, Redis y MinIO persisten en Docker volumes — no se pierden al reiniciar.
- SSL: Nginx termina TLS con Let's Encrypt (`certbot`) o certificados propios.
- El `.env` nunca se sube al repositorio — solo `.env.example` se versiona.
- Para múltiples instancias en el mismo VPS: cambiar los puertos externos en cada `docker-compose.yml` (ej. cliente A en 8080, cliente B en 8081) y usar subdominios en Nginx.

---

## Modelo de datos — Prisma Schema

Ver archivo `schema.prisma`. Las entidades principales del dominio son:

`Usuario` → `Conductor` → `Unidad` → `Cliente` → `Viaje` (aggregate root) → `HistorialEstadoViaje` + `UbicacionConductor` + `GastoViaje` + `EvidenciaViaje` → `CartaPorte` → `Factura`

Sin `tenantId` en ninguna tabla — cada instancia Docker es un cliente, la BD ya está aislada por diseño.

---

## Módulos del MVP

### 1. Autenticación
- Login de admin (panel web) con JWT + refresh tokens
- Login de conductor (app Flutter) con JWT
- Passwords hasheados con bcrypt
- Sin roles ni permisos por el momento — se agrega en Fase 2

### 2. Gestión de flota
- Catálogo de unidades: placas, tipo, capacidad, aseguradora, póliza
- Documentos por unidad: verificación, seguro, tarjeta de circulación
- Alertas automáticas de vencimiento vía BullMQ (7, 3 y 1 día antes)

### 3. Gestión de conductores
- Perfil: datos personales, foto, contacto
- Documentos: licencia federal, vigencia, examen médico
- Alertas de vencimiento de documentos
- Historial de viajes por conductor

### 4. Gestión de viajes
- Creación: origen, destino, tipo de carga, peso, dimensiones, cliente
- Asignación de unidad y conductor
- Estados: `asignado → aceptado → en camino al origen → cargando → en tránsito → entregado → facturado`
- Historial y búsqueda

### 5. Tracking en tiempo real
- GPS en background desde Flutter (`flutter_background_service` + `geolocator`)
- Posición en tiempo real vía Socket.io al panel del monitorista
- Geocercas: notificación de llegada a origen y destino
- Link de seguimiento público para cliente final (sin login)
- Alerta si un viaje lleva N minutos sin actualizar posición

### 6. App del conductor (Flutter)
- Login y selección de unidad asignada
- Lista de viajes asignados (hoy y próximos)
- Cambio de estado del viaje con un tap
- Tracking GPS en background durante viaje
- POD: foto de mercancía + firma digital del receptor + geolocalización + timestamp
- Registro de gastos: combustible, casetas, viáticos (foto del ticket)
- Captura de odómetro al inicio y fin
- Botón de navegación → abre Google Maps / Waze al destino
- Modo offline: cola local SQLite (`drift`) que sincroniza al recuperar señal
- Alertas en tiempo real vía Socket.io mientras la app está activa

### 7. Carta Porte (CFDI 4.0)
- Generación del XML con datos del viaje
- Timbrado vía PAC (Facturama / SW Sapien / Finkok) por REST API
- Descarga de XML y PDF
- Estados: `borrador → pendiente timbrar → timbrado → cancelado`
- Vinculación 1:1 con el viaje

### 8. Facturas y cuentas por cobrar (registro, no cobro)
- Generación de cotización / factura
- Estados: `borrador → enviada → pagada → vencida`
- Registro manual de pago (el dinero fluye directo entre partes)
- Vinculación factura ↔ viaje ↔ Carta Porte

### 9. Panel del admin / monitorista (Next.js)
- Dashboard: métricas en tiempo real (viajes activos, Carta Portes pendientes, entregas del día, alertas)
- Mapa de tracking con Leaflet + OpenStreetMap
- Lista de viajes del día con estados
- Módulo de Carta Porte: pendientes y historial
- Módulo de facturas: recientes y vencidas
- Centro de alertas: vencimientos de documentos y eventos de viaje

### 10. Notificaciones
- Alertas en app Flutter vía Socket.io (app activa)
- WhatsApp Business API: notificación de estado al cliente final
- Email vía Nodemailer: resumen diario al admin

---

## Fases de entrega

### Fase 1 — Fundamentos operativos (0–3 meses)
- [x] Auth JWT para admin y conductor
- [x] CRUD de flota y conductores con alertas de vencimiento — *API + panel web ✅*
- [x] Creación y gestión de viajes con estados — *API + panel web (lista, detalle, máquina de estados) ✅*
- [ ] App Flutter: viajes, cambio de estado, tracking + Socket.io
- [x] Link de seguimiento público para cliente final — *API `GET /tracking/:token` ✅; página pública sin login pendiente*
- [x] Dashboard del monitorista (Next.js) — *dashboard, mapa en vivo y CRUDs ✅*
- [x] Docker Compose funcional para dev y producción — *dev verificado; prod definido (Dockerfiles api + web)*
- [x] Script de alta de instancia nueva — *`scripts/alta-cliente.sh` + build/registry + actualización (ver `scripts/README.md`)*

### Fase 2 — Diferenciador fiscal (3–5 meses)
- [ ] Integración PAC → Carta Porte CFDI 4.0
- [ ] POD: foto, firma digital, geolocalización
- [ ] Registro de gastos por viaje con foto de ticket
- [ ] Facturas y cuentas por cobrar
- [ ] Notificaciones WhatsApp al cliente
- [ ] Modo offline Flutter (SQLite + sync)
- [ ] Roles y permisos básicos (monitorista, solo lectura)

### Fase 3 — Retención y escala (5+ meses)
- [ ] Cálculo de rutas y casetas
- [ ] Mantenimiento preventivo de unidades
- [ ] Checklist de inspección pre-viaje
- [ ] Reportes de rentabilidad por viaje / unidad
- [ ] Reporte de incidentes
- [ ] Historial de liquidaciones del conductor
- [ ] Push notifications FCM (si feedback lo justifica)
- [ ] Panel de administración propio para gestionar instancias de clientes
- [ ] **Observabilidad — logging estructurado de errores + Seq:** servidor de logs **Seq** (`datalust/seq`) como servicio en `docker-compose` (una instancia compartida o por cliente), e integración en NestJS con un logger estructurado (p. ej. Pino/Winston) + **filtro global de excepciones** que envíe errores y eventos a Seq. Configurable por env (`SEQ_SERVER_URL`/API key) y tolerante a Seq caído (no debe tumbar el sistema, igual que el SMTP). Permite buscar/diagnosticar errores en producción por instancia.

---

## Registro de avances

> Bitácora de implementación. Cada entrada documenta qué se construyó y cómo se verificó.

### 2026-06-03 — Cimientos del monorepo (Fase 1, base) ✅

Se levantó toda la base sobre la que se construyen los módulos, **verificada de punta a punta**.

**Implementado:**
- Monorepo con **npm workspaces** (`apps/api`, `apps/web`, `packages/shared-types`). Se eligió npm en vez de pnpm porque no estaba instalado y npm workspaces cubre el caso sin setup extra.
- **`docker-compose.yml`** (producción) + **`docker-compose.override.yml`** (desarrollo: expone Postgres/Redis/MinIO al host y deja `api`/`web`/`nginx` tras el perfil `full` para correrlos con hot-reload). Healthcheck en Postgres.
- **Nginx** (`nginx/nginx.conf`) como reverse proxy: `/api` → API (conserva prefijo), `/socket.io` → WebSocket, `/` → panel web. `client_max_body_size 25m` para POD.
- **`postgres/init.sql`**: habilita extensiones `postgis` y `uuid-ossp`.
- **`.env.example`** + `.env` de desarrollo con todas las variables (DB, Redis, JWT access/refresh, MinIO, PAC, WhatsApp, SMTP).
- **Schema Prisma completo** (`apps/api/prisma/schema.prisma`) — 13 modelos del dominio: `Usuario`, `Conductor`, `Unidad`, `DocumentoUnidad`, `DocumentoConductor`, `Cliente`, `Viaje` (aggregate root con `trackingToken` y `folio`), `HistorialEstadoViaje`, `UbicacionConductor`, `GastoViaje`, `EvidenciaViaje`, `CartaPorte`, `Factura`. Sin `tenantId` (instancia-por-cliente). Enums incl. `EstadoViaje` con su ciclo de vida.
- **Esqueleto NestJS Clean Architecture** (`domain`/`application`/`infrastructure`/`presentation`): `main.ts` (prefijo global `/api`, CORS, `ValidationPipe` con whitelist), `PrismaModule` global + `PrismaService`, `HealthController`.
- **`packages/shared-types`**: enums compartidos (api ↔ web) + `TRANSICIONES_VIAJE` (máquina de estados del viaje) + `WS_EVENTS` + contratos de auth.
- **Seed** del usuario admin inicial (`prisma/seed.ts`, bcrypt).
- **Dockerfile** multi-stage del API (build + runtime con `prisma migrate deploy` al arrancar).

**Verificado:**
- `npm install` (770 paquetes), `shared-types` compila, `prisma generate` OK (schema válido).
- `docker compose up` → Postgres/PostGIS + Redis + MinIO arriba; Postgres `healthy`.
- `prisma migrate dev` → migración `init` aplicada; **seed** crea `admin@flotaos.local`.
- API compila (`nest build`), arranca y **`GET /api/health` responde `{"status":"ok","db":"up"}`** (conexión a BD confirmada).

### 2026-06-03 — Backend Fase 1: 7 módulos API (fan-out multiagente) ✅

Construidos en paralelo con orquestación multiagente (1 agente para Auth + 6 en paralelo), cableados en `AppModule` y **verificados con una prueba de humo de 23 asserts contra el API en vivo (23/23 ✅)**.

**Módulos backend implementados:**
- [x] **Auth** — JWT access + refresh para admin (`Usuario`) y conductor (`Conductor`); bcrypt; guards `JwtAuthGuard`/`AdminGuard`/`ConductorGuard`; decorador `@CurrentUser()`. Endpoints: `POST /auth/login`, `/auth/conductor/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`.
- [x] **Clientes** — CRUD con búsqueda y paginación; bloquea borrado si hay viajes.
- [x] **Flota** — CRUD de unidades (placas únicas) + documentos por unidad con `fechaVencimiento` + `GET /unidades/documentos/por-vencer`.
- [x] **Conductores** — CRUD (solo admin) con password bcrypt, nunca expone hashes; documentos + por-vencer; `GET /conductores/:id/viajes`.
- [x] **Viajes** (aggregate root) — crear/listar/detalle/editar/asignar; **cambio de estado validado contra `TRANSICIONES_VIAJE`** con registro en `HistorialEstadoViaje`; filtros y paginación.
- [x] **Tracking** — gateway **Socket.io** (salas `viaje:<id>`), ingesta de ubicación del conductor (individual y en lote offline), **geocercas Haversine (300 m)**, y **link público** `GET /tracking/:token` sin auth.
- [x] **Alertas** — cola **BullMQ** con job diario (cron `0 8 * * *`) que escanea vencimientos a 7/3/1 días y notifica por email (Nodemailer); endpoint `GET /alertas/vencimientos?dias=N` para el centro de alertas. Tolerante a Redis caído.

**Verificado (prueba de humo en vivo):** login admin/conductor, protección 401 sin token, CRUD de cliente/unidad/conductor, creación de viaje (folio + trackingToken), transición de estado válida e inválida (400), historial, ingesta de ubicación por el conductor, link público de tracking, alertas y refresh de token. Build (`nest build`) y type-check (`tsc --noEmit`) en verde.

**Pendiente de Fase 1:** panel web Next.js (dashboard, mapa, CRUDs), app Flutter del conductor, página pública de seguimiento, y script de alta de instancia.

### 2026-06-03 — Revisión y refactorización del backend (multiagente) ✅

Revisión de código multiagente (4 dimensiones × verificación adversarial, 44 agentes) → **39 hallazgos confirmados, 1 falso positivo descartado**. Correcciones aplicadas con un agente por módulo y **verificadas con prueba de humo ampliada (22/22 ✅)**.

**🔴 Seguridad (corregido):**
- **Autorización por rol**: `AdminGuard` aplicado a clientes, flota, alertas y a las operaciones administrativas de viajes (crear/editar/asignar). Antes un token de conductor podía operarlas.
- **WebSocket de tracking autenticado**: el gateway valida el JWT en el handshake y solo deja suscribirse a la sala del viaje al admin o al conductor dueño; `cors.origin` configurable por entorno.
- **Verificación de propiedad**: un conductor solo ve sus viajes en `GET /viajes` y solo puede avanzar el estado de viajes asignados a él (viaje ajeno → 403).

**🟠 Bugs (corregido):**
- `documentos/por-vencer` ahora acota `[inicio de hoy, hoy+días]` (antes traía todo el histórico vencido). Semántica unificada en flota, conductores y alertas.
- El evento WS `viaje:estado` ya se emite al cambiar de estado (Viajes inyecta el `TrackingGateway`).
- `pageSize` acotado a 100 en todos los listados (vía el helper común).

**🟡 Consistencia / Clean Architecture (corregido):**
- **Paginación unificada**: un solo `Paginado<T>` en `shared-types` + helper `paginar()`; los 4 listados devuelven `{ data, total, page, pageSize, totalPaginas }`.
- **Capas**: `AuthService` movido a `application`; viajes usa interfaces `*Input` propias → la capa `application` ya no importa de `presentation`.
- **Deduplicación**: `PasswordService` centraliza bcrypt; `ConductorPublico` canónico único; util de fechas UTC compartido; `DiasVencimientoDto` único; `PartialType` en los DTOs `Actualizar*`.
- Convenciones unificadas: `execute()` en use cases, fechas de entrada `@IsDateString`, mensajes NotFound homogéneos.

**🟢 Eficiencia (corregido):**
- Lote de ubicaciones con `createManyAndReturn` (antes hasta 500 INSERT en serie).
- Validaciones de existencia vía captura de `P2025`; validaciones independientes con `Promise.all`; escaneo de vencimientos consolidado de 6 → 2 queries.

> Falso positivo descartado por la verificación: la conexión Redis separada en cola/worker (es el patrón recomendado de BullMQ).

### 2026-06-03 — Swagger UI (documentación interactiva) ✅

Agregado `@nestjs/swagger` con el plugin de introspección activado (auto-genera los schemas de los DTOs sin decorar a mano). **Swagger UI disponible en `/api/docs`** con autenticación Bearer (botón "Authorize") y "Try it out" en los 44 endpoints. El spec OpenAPI incluye el prefijo global `/api`. Útil para probar el backend sin panel web todavía.

### 2026-06-03 — Panel web Next.js (multiagente) ✅

Cimientos por mí + **7 páginas construidas en paralelo** (un agente por módulo). **Build de producción y type-check en verde; dev server sirviendo las 11 rutas; datos de demo cargados.**

**Cimientos (base verificada):**
- Next.js 14 (App Router) + TypeScript + Tailwind + **shadcn/ui** (12 componentes) + **TanStack Query**.
- Cliente **axios con JWT + refresh automático** en 401; contexto de auth; **login** funcional; layout protegido que redirige a `/login`.
- Shell con **sidebar** (Dashboard, Viajes, Mapa, Flota, Conductores, Clientes, Alertas) + topbar con logout. Componentes/utilidades compartidas (`PageHeader`, `ConfirmDialog`, `useDebounce`, helpers de estado de viaje).

**Páginas (fan-out):**
- **Clientes** — CRUD con búsqueda, paginación y diálogos (react-hook-form + zod).
- **Flota** — CRUD de unidades + gestión de documentos con badge de vencimiento.
- **Conductores** — CRUD (password al crear) + documentos + historial de viajes.
- **Viajes** — lista con filtros + detalle `/viajes/[id]` con **cambio de estado guiado por `TRANSICIONES_VIAJE`**, asignación, historial y link público copiable.
- **Mapa en vivo** (`/tracking`) — **Leaflet + OpenStreetMap**, carga inicial de la última posición de viajes activos y actualización en tiempo real vía **Socket.io**; lista lateral de activos.
- **Dashboard** — métricas reales (viajes activos, entregas de hoy, asignados, alertas) con auto-refresh + próximos vencimientos.
- **Alertas** — centro de vencimientos con filtro de días y Tabs unidad/conductor.

**Extras:** `@nestjs/swagger` (UI en `/api/docs`); **seed de datos de demo** (`apps/api/seed-demo.mjs`); Dockerfile del panel.

**Pendiente de Fase 1:** app Flutter del conductor, página pública de seguimiento sin login, y script de alta de instancia.

### 2026-06-04 — Repositorio en GitHub + endurecimiento de seguridad ✅

Primer commit del proyecto y publicación en **GitHub** (`DesarrollosDavidGarcia/floatOS`); el `.gitignore` garantiza que `.env` nunca se suba (solo `.env.example`).

**Seguridad (corregido y verificado en vivo):**
- **Token de seguimiento público criptográficamente seguro:** el `trackingToken` del link público `GET /tracking/:token` pasó de `cuid()` (semi-predecible) a `crypto.randomBytes(24)` URL-safe, cerrando una fuga de PII (ubicación en vivo, nombre del conductor, direcciones). Sin migración SQL (el default de cuid era client-side).
- **Rate limiting** con `@nestjs/throttler`: baseline global 120/min; login admin y conductor 10/min; refresh 30/min; link público 60/min; la ingesta de GPS exenta (`@SkipThrottle`). `trust proxy=1` para contar por IP real tras Nginx. Verificado en vivo: 10× login → 401 y el 11º → **429**.

> Nota de entorno: el Node global de la máquina es v16 (rompe Prisma 6 con error WASM `externref`); se usa **Node 20 vía nvm** para Prisma y para correr API/web.

### 2026-06-04 — Expediente formal del conductor (multiagente) ✅

Se amplió el módulo de conductores a un **expediente formal** de 11 secciones, construido con fan-out multiagente (1 agente por sección, sobre un cimiento de schema/tipos hecho a mano) y **verificado con prueba de humo en vivo (12/12 ✅)**.

**Modelo de datos (Prisma):** se extendió `Conductor` con datos de RH (CURP, RFC, NSS, fecha de nacimiento, tipo de sangre, dirección, número de empleado, puesto, fecha de ingreso, categoría de licencia SCT, contacto de emergencia) y se agregaron **9 entidades nuevas** + enums: `ExamenMedicoConductor`, `CertificacionConductor`, `CapacitacionConductor`, `IncidenciaConductor` (vinculable a `Viaje`), `EventoLaboralConductor`, `AptitudUnidadConductor` (único por tipo de unidad), `ControlConfianzaConductor`, `EvaluacionDesempenoConductor`, `AusenciaConductor`. Migración `expediente_conductor` aplicada (sin pérdida de datos).

**Secciones (pestañas del expediente):** Datos/RH · Documentación (enum ampliado: INE, CURP, RFC, comprobante, constancia fiscal, contrato, alta IMSS) · Médico (análisis continuo) · Certificaciones · Capacitaciones · Control de confianza · Aptitud por unidad · Incidencias (incl. reconocimientos) · Evaluaciones con KPIs · Progreso (línea de tiempo) · Ausencias/incapacidades.

**API:** cada sección es un módulo NestJS independiente (`presentation/http/conductores/expediente/<seccion>`) con su use case, DTOs (class-validator) y controller bajo `conductores/:conductorId/...`, protegido con `JwtAuthGuard + AdminGuard`, agrupados en `ExpedienteModule`. **Web:** página `/conductores/[id]` con pestañas (shadcn Tabs), una pestaña CRUD por sección (TanStack Query), enlazada desde la lista de conductores.

**Verificado (en vivo):** `tsc --noEmit` + `nest build` + type-check web en verde; las 10 sub-rutas montadas; prueba de humo: login, PATCH de Datos/RH (persistencia de CURP/puesto/categoría), POST/GET en médico/certificaciones/incidencias/evaluaciones/ausencias, **409** por duplicado de aptitud (unique), **400** por enum inválido y **401** sin token. Página del expediente compila y responde 200.

**Pendiente (follow-up):** integrar los vencimientos de médico/certificaciones/control de confianza al centro de alertas (BullMQ); subida real de archivos (MinIO) para los `*Key`.

### 2026-06-04 — Catálogos autoadministrables (multiagente) ✅

Se reemplazaron los dropdowns de **enums fijos** por un **catálogo genérico administrable** desde el panel, para que las opciones de tipo/categoría no requieran tocar código. **Verificado en vivo**: agregar una opción y usarla de inmediato en un registro real (201, sin rechazo de validación).

**Datos:** modelo `CatalogoItem` (grupo, codigo, nombre, orden, color, activo; único por grupo+codigo). Migración que convierte ~14 columnas `enum → TEXT` **preservando datos** (`ALTER ... TYPE TEXT USING`, escrita a mano porque el `migrate diff` de Prisma generaba un `DROP/ADD` destructivo). Los **estados con lógica** (`EstadoViaje`, `EstadoCartaPorte`, `EstadoFactura`) siguen como enum. Seed idempotente: **117 items en 18 grupos** (con `color` para resultado/gravedad/nivel).

**API:** `CatalogosModule` — `GET /catalogos/grupos`, `GET /catalogos/:grupo` (con `?soloActivos`), `POST/PATCH/DELETE`, `AdminGuard`, 409 por código duplicado. Los DTOs de los campos afectados pasaron de `@IsEnum` a `@IsString` (clave para aceptar valores nuevos del catálogo).

**Web:** pantalla **Catálogos** (`/catalogos`, en el sidebar) que administra los 18 grupos. Piezas reutilizables: hook `useCatalogo(grupo)`, `<CatalogoSelect>` (dropdown), `<CatalogoTexto>`/`<CatalogoBadge>` (etiqueta/color desde BD). Se recablearon ~13 dropdowns (expediente, datos/RH —incl. puesto y tipo de sangre que eran texto libre—, flota: tipo de unidad, aseguradora, documentos de unidad).

**Verificado:** `tsc` (API y web) + `nest build` en verde; migración con diff vacío posterior (BD == schema) y datos intactos; smoke en vivo: 18 grupos, alta de item nuevo (201), duplicado (409), y uso del código nuevo en un examen real (201). Páginas `/catalogos`, `/conductores/[id]`, `/flota` sirviendo 200.

### 2026-06-04 — Rediseño UX/UI del panel (multiagente) ✅

Pasada integral de experiencia sobre el panel Next.js, con fan-out multiagente y **piezas compartidas reutilizables**. **Verificado: `tsc` web en verde y páginas 200 en cada bloque.**

**Formularios:**
- Expediente: alta/edición en **modal compacto** (`ExpedienteFormDialog`, `CamposGrid`, `Campo`) en vez de formularios inline largos.
- **Validación con feedback visual** consistente (react-hook-form + zod, `mode: onTouched`): asterisco de requerido, **borde rojo** del campo inválido y mensaje del porqué. Helpers en `lib/validacion` (requeridos, rangos numéricos, coherencia de fechas, formatos CURP/RFC/NSS/teléfono). Aplicada a las 11 secciones del expediente y a los formularios de **conductor, unidad, cliente y viaje**.

**Tablas:**
- Filas de **2 líneas** (valor + subtexto de contexto), **vigencia con badge** (Vigente/Por vencer/Vencido), fechas y montos formateados, "—" en vacíos y conteo de registros. Piezas en `tabla-ui` (`CeldaPrincipal`, `Fecha`, `Vigencia`, `Dinero`, `Conteo`).
- **Columnas responsivas**: ~3 en móvil, ~5 en mediano, todas en grande (`hidden md/lg:table-cell`). Altura de fila compacta. Consistente en todas las listas y en las 9 tablas del expediente.

**Listas:** `/conductores` enriquecida (avatar de iniciales, nombre→expediente, contacto, licencia, acciones en menú **⋯** con borrado confirmado). Mismo trato en **clientes, flota, viajes y alertas** (multiagente). Barra de filtro + acción en la fila del título; paginación siempre visible.

**Layout / navegación:** **topbar** con campana de **notificaciones** (conectada a `/alertas/vencimientos`: badge con conteo y urgencia, dropdown con próximos) y **menú de perfil** (avatar, nombre/email, cerrar sesión); **sidebar agrupado** por secciones (Operación / Gestión / Sistema); **menú hamburguesa siempre** (sidebar como drawer en todos los tamaños); panel **responsive** (header que apila en móvil, tablas con scroll y columnas adaptativas).

### 2026-06-05 — Auditoría de código + correcciones (seguridad / correctitud / mantenibilidad) ✅

Auditoría completa multiagente (API + web) → informe **`FlotaOS_Auditoria.md`**. Fixes aplicados en la rama **`auditoria/fixes-seguros`** (aún sin merge a `main`), verificados con `tsc` por fase + revisión adversarial del propio diff (sin regresiones).

**🔴 Seguridad / correctitud:**
- **IDOR** cerrado en `GET /viajes/:id/historial` (un conductor podía leer el historial de viajes ajenos).
- **Race TOCTOU** en el cambio de estado del viaje: `update` condicional `where:{ id, estado }` + `P2025 → 409` (evita doble transición/historial).
- **bcrypt del refresh token** (real, verificado): pre-hash **SHA-256** antes de bcrypt — bcrypt truncaba a 72 bytes y la rotación/revocación no funcionaba.
- `listar-viajes-conductor` paginado y sin exponer `trackingToken`; chequeos de existencia con `select:{ id }` (ya no traían `passwordHash`); **CORS** por `CORS_ORIGIN` (coherente con el WS); cabeceras de seguridad (`nosniff`, `X-Frame-Options`); **índices** en `Viaje` (`estado+createdAt`, `fechaProgramada`, `createdAt`).

**🧹 Reducción de duplicación / mantenibilidad:** helper único `asegurarConductorExiste` (9 use cases del expediente); `DocumentosDialogBase` (diálogos de documentos conductor/unidad ~650→~270 líneas); hook `useEntityFormDialog` (4 form-dialogs); `ConfirmDialog` reutilizado en las 3 listas; **`lib/vencimiento.ts`** con regla escalonada única (vencido / crítico ≤7 / por vencer ≤30 / vigente); `Paginado` y `BadgeVariant` centralizados. Corrección de criterio: `tipo/nivel/resultado/gravedad` son `String` de catálogo con `@default` (no enums) → se quitaron `as any` innecesarios (no se añadió `@IsEnum`).

**Diferido (documentado en el informe):** controller-factory genérico del expediente y migración del panel a cookies (esto último ya hecho, ver siguiente entrada).

### 2026-06-05 — Auth dual: cookies httpOnly (panel) + bearer (móvil) ✅

El **panel web** deja de guardar tokens en `localStorage` (riesgo XSS) y pasa a **cookies `httpOnly` + `Secure` + `SameSite=Strict`** emitidas por la API en login/refresh; la API **sigue devolviendo los tokens en el body** para la futura **app móvil** (bearer). La JWT strategy y el gateway WS leen el token de **cookie o header**; logout limpia las cookies; CORS con `credentials`. El web rehidrata la sesión con `GET /auth/me` (sin tocar tokens en JS). **Verificado en vivo**: login emite cookie + tokens, `/auth/me` solo con cookie (200), refresh por cookie (200), logout (204).

### 2026-06-05 — Auditoría UX/UI del panel + correcciones ✅

Auditoría UX/UI multiagente (accesibilidad, consistencia, responsive, estados/microcopy) → informe **`FlotaOS_Auditoria_UX.md`**; fixes objetivos aplicados.
- **Accesibilidad:** el componente `Campo` inyecta `aria-invalid`/`aria-describedby`/`aria-required` y marca el error con `role="alert"` (la validación se anuncia en lectores de pantalla); `aria-label` en botones-icono y menús de acción; `<th scope="col">`; `CatalogoSelect` acepta `id`/`aria-label`; título de sección dinámico en el topbar.
- **Consistencia:** **`lib/fecha.ts`** unifica los 4 formatos de fecha dispersos; piezas compartidas **`SearchInput`/`PaginacionFooter`/`EstadoTabla`** (criterio único de footer, skeleton y estados error/vacío) en las 4 listas; folio con `#`; `BadgeVariant` desde `ui/badge`.
- **Responsive:** `DialogContent` con `max-h-[90vh]` + scroll (el botón Guardar deja de quedar fuera de pantalla en móvil); área táctil ≥40px en menús; títulos de detalle `text-xl sm:text-2xl`.
- **Estados / microcopy:** errores reales (`apiError`) y vacíos que distinguen "sin búsqueda" vs "sin datos"; catálogos "Opción/Activa" + colores en español.
- **Dev:** `next dev --turbo` (Turbopack) — compila ~2–3× más rápido; sólo afecta a desarrollo. Verificado: `tsc` web en verde y rutas 200. *(⚠ Revertido el 2026-06-06: Turbopack es incompatible con react-leaflet en SSR — ver entrada de Viajes; el dev del web usa webpack.)*

### 2026-06-05 — Archivos de unidad en MinIO (póliza de seguro + generales) ✅

Nueva capacidad de **adjuntar varios archivos por unidad**. No existía pipeline de archivos (`archivoKey` estaba definido pero sin usar); se construyó de punta a punta.
- **Backend:** modelo **`ArchivoUnidad`** (categoría `POLIZA_SEGURO|GENERAL`, varios por unidad) + migración; **`StorageService` (MinIO)** — subir, **URL temporal firmada** para descarga, eliminar; crea el bucket bajo demanda; `ArchivosUnidadUseCase` valida **PDF/imagen ≤10 MB** y **no expone la object key**; endpoints en `FlotaController` (`POST` multi-archivo vía `FilesInterceptor`, `GET` listar por categoría, `GET .../url`, `DELETE`); `StorageModule` global.
- **Web:** `ArchivosDialog` con dos secciones (**Póliza de seguro** / **Archivos del vehículo**), subida múltiple con validación en cliente, descarga y borrado; opción **"Archivos"** en el menú de cada unidad.
- **Verificado en vivo** end-to-end contra MinIO: subir → bucket `flotaos` creado → listar → URL firmada → borrar (204).
- Esta pieza (subida a MinIO) es la **base para POD y registro de gastos con foto** (Fase 2).

### 2026-06-05 — Marca y Modelo de unidad como catálogos ✅

**Marca** y **Modelo** del alta de unidad pasan de texto libre a **dropdowns de catálogo** (`MARCA_UNIDAD`, `MODELO_UNIDAD`), administrables desde la pantalla de **Catálogos**. Se añadieron los grupos a `CATALOGO_GRUPOS` (en `shared-types`, donde la lista de grupos es fija) y al seed (lista inicial editable). La tabla de flota resuelve los códigos con `CatalogoTexto`; **los valores ya escritos se conservan**. (Los demás dropdowns de flota —tipo de unidad, aseguradora, tipo de documento— ya eran catálogos editables.) **Verificado:** 20 grupos en `/catalogos/grupos`, `tsc` web en verde, `/flota` y `/catalogos` 200.

> **Pendiente de cierre de Fase 1:** la **página pública de seguimiento** sin login (`/seguimiento/<token>` — el API ya existe) y la **app Flutter** del conductor. Todo lo anterior vive en la rama `auditoria/fixes-seguros` (pendiente de merge a `main`).

### 2026-06-06 — Despliegue: build central + registry + scripts de operación ✅

Se cerró la administración de actualizaciones del modelo **instancia-por-cliente**. Antes el compose construía las imágenes en cada VPS (`build:`), lo que a escala es lento y no garantiza el mismo binario entre clientes.

**Imágenes y compose:**
- `api` y `web` pasan de `build:` a **`image:`** (`${IMAGE_REGISTRY}/flotaos-{api,web}:${FLOTAOS_VERSION}`). Cada instancia hace `docker compose pull` en vez de compilar.
- **`docker-compose.build.yml`** (overlay solo de build): agrega el contexto y hornea la URL de API/WS como **ruta relativa** (`/api` + mismo origen). Resultado clave: **una sola imagen `web` sirve a todos los clientes** sin recompilar por subdominio (antes `NEXT_PUBLIC_API_URL` se horneaba con el dominio del cliente).
- El override de dev conserva el `build` bajo el perfil `full`.

**Seeds para producción:**
- `prisma/seed.ts` (requería `ts-node`, devDependency ausente en la imagen) → portado a **`prisma/seed-admin.mjs`** (Node plano: `@prisma/client` + bcrypt, ambos runtime). El alta lo corre con `docker compose exec api node prisma/seed-admin.mjs`.
- El **seed de catálogos** (`seed-catalogos.mjs`, idempotente) ahora corre en el **CMD del API** junto con `prisma migrate deploy` → tras cada deploy las migraciones y los catálogos quedan al día solos.

**Scripts (`scripts/`, ver `scripts/README.md`):** `build-publicar.sh` (build+tag+push), `alta-cliente.sh` (crea `clientes/<x>/` con secretos aleatorios, levanta y crea admin), `actualizar-cliente.sh` (backup→pull→recrea→health) y `actualizar-todos.sh`. `clientes/` añadido a `.gitignore` (secretos por cliente).

**Verificado:** `docker compose config` válido en prod, build-overlay y dev-`full`; `bash -n` en verde en los 4 scripts; imágenes etiquetadas con versión + `latest`.

**Auditoría del despliegue + correcciones (mismo día):**
- **A1 (🔴):** el CLI de `prisma` (devDependency) no entraba a la imagen de runtime → `migrate deploy` al arrancar dependía de bajarlo por red. Fix: se copia `node_modules/prisma` + su bin del build stage (solo depende de `@prisma/*`, ya presente).
- **A2 (🟠):** los defaults de `api.ts`/`socket.ts` apuntaban a `localhost:3000`; ahora son **relativos** (`/api` y mismo origen) → prod correcto aunque no se pasen build-args; dev sigue por `.env.local`.
- **A3:** `alta-cliente.sh` acepta `[http_port] [https_port]` y los escribe antes del `up` (varias instancias por VPS sin choque de puertos).
- **A4:** `python3/make/g++` en el Dockerfile (build y runtime efímero) para compilar `bcrypt` nativo en Alpine/musl.
- **A5:** `build-publicar.sh` verifica `docker login` antes de publicar.
- **A6:** `actualizar-cliente.sh` aborta si el `pg_dump` queda vacío y guarda la versión previa para imprimir comandos de rollback (imagen / restaurar BD).
- **A7:** el `ADMIN_PASSWORD` se borra del `.env` del cliente tras crear el admin (ya hasheado en BD).
- **A8:** el seed de catálogos en el `CMD` es tolerante (un fallo no tumba el API; las migraciones siguen siendo estrictas).

### 2026-06-06 — Producción: Traefik (HTTPS automático) + backups offsite ✅

Capa de "operar en internet" para el modelo instancia-por-cliente (en `infra/traefik/` y `scripts/`).

- **Traefik** como proxy de borde único por VPS: termina TLS con **Let's Encrypt** (desafío HTTP-01) y enruta cada **subdominio** a su instancia por labels de Docker (red externa `flotaos-edge`); 80 redirige a 443; certs y renovación automáticos.
- **Overlay de instancia** `docker-compose.traefik.yml`: en modo Traefik el nginx por instancia queda apagado (perfil `sin-traefik`), evitando choque de puertos; Traefik enruta `Host()`→web y `/api`+`/socket.io`→api (un solo salto, sin impacto de rendimiento). Vars `CLIENT_DOMAIN`/`CLIENT_NAME`.
- **Backups** (`scripts/backup-cliente.sh`, `backup-todos.sh`): `pg_dump` gz (online, no bloquea) + tar del volumen de MinIO, con retención local y **offsite opcional** vía rclone; ejemplo de cron 3am.
- `.gitignore`: `infra/traefik/acme.json` (claves de certs), `.env.docker`, `.env.smoke`.
- **Verificado:** `docker compose config` válido en el stack de Traefik y base+overlay; `bash -n` en verde. (Let's Encrypt no se prueba en local: requiere VPS con dominio y 80/443 públicos.)

### 2026-06-06 — Viajes: itinerario multi-escala + motor de cálculo + mapa + PostGIS ✅

Rediseño completo de **/viajes** (PR aparte `feat/viajes-multiescala`, base `auditoria/fixes-seguros`). La creación pasa de modal a **página completa** con constructor de itinerario; un viaje tiene **varias escalas** y cada escala puede **recoger/entregar/reemplazar** carga (la carga vive por escala).

**Datos/PostGIS:** modelos `EscalaViaje`, `CargaEscala`, `CompatibilidadCargaUnidad`; campos de motor en `Unidad` (capacidadM3, rendimientoKmL, capacidadTanqueL) y snapshot en `Viaje` (distanciaEstimadaKm, pesoMaxKg, volumenMaxM3); columna **`geography(Point,4326)` GENERADA + índice GIST** en `escalas_viaje` (declarada `Unsupported` en Prisma para evitar drift); migración + **backfill** de los viajes existentes; catálogos `TIPO_CARGA`/`ACCION_ESCALA`/`SENTIDO_CARGA` + reglas de compatibilidad. `origen/destino/tipoCarga/pesoKg` de `Viaje` quedan como **resumen derivado**.

**Backend (Clean Architecture):** dominio `motor-calculo.ts` (carga máx por tramo + veredictos SOBREPESO/SOBRE_VOLUMEN/TIPO_INCOMPATIBLE/AUTONOMIA_INSUFICIENTE/DATOS_INCOMPLETOS, **9/9 tests**); `MotorViajeService` (distancia geodésica PostGIS `ST_MakeLine/ST_Length` + evaluación de flota con allow-list de compatibilidad); **`POST /viajes/evaluar`**; crear/editar reescritos con escalas+cargas anidadas y snapshot; geocercas por escala con **`ST_DWithin`** (reemplaza Haversine) y alerta `llegada_escala`.

**Frontend:** páginas `/viajes/crear` y `/viajes/[id]/editar` (`ViajeFormPage`, react-hook-form + useFieldArray); `ItinerarioBuilder`/`EscalaCard`; **`MapPickerDialog`** (Leaflet + Nominatim: buscar dirección + pin arrastrable + reverse-geocoding); **`PanelMotor`** (evaluación en vivo con debounce, recomienda unidad); el **detalle** muestra el itinerario + snapshot, un **mapa con las escalas y la ruta pintada** (`MapaItinerario`) y el **veredicto del motor para la unidad asignada** (`VeredictoUnidadCard`); se eliminan los modales viejos.

**Verificado:** `tsc` API+web en verde, 9/9 tests del motor, smoke en vivo (evaluar/crear/detalle), distancia PostGIS CDMX→QRO→GDL ≈ 500 km, geocerca `ST_DWithin` (en escala detecta, a 5 km no), rutas web 200.

**Auditoría multiagente (4 dimensiones: backend/seguridad, datos/migraciones, frontend, completitud) + correcciones aplicadas (13):** `trackingToken` ya no se expone al conductor; **compatibilidad de refrigerados** (tipos `CAJA_SECA`/`CAJA_REFRIGERADA`; reefer solo en caja refrigerada) + advertencia cuando un tipo de carga no tiene reglas; `editar` bloquea reescribir el itinerario de un viaje ya iniciado (409); `asignar` con `null` **desasigna** (antes reventaba); geocercas **dedup entre lotes** (columna `llegadaNotificadaEn`) y evalúan todos los puntos del lote; el motor no recomienda unidades con `DATOS_INCOMPLETOS`; cliente usa `razonSocial` (salía vacío); + menores (fecha sin corrimiento TZ, "agregar parada" antes del destino, `@ArrayMaxSize`, MapPicker aborta/no auto-busca/no re-centra).

**Dev — Turbopack revertido a webpack:** `next dev --turbo` evalúa react-leaflet (ESM) en el grafo de SSR y corrompe el dispatcher de React (`usePathname`/ErrorBoundary → "Cannot read properties of null (reading 'useContext')"), devolviendo 500 incluso en páginas sin mapa. El `dev` del web vuelve a **webpack** (`next dev`); producción (`next build`) ya usa webpack, no afectada.

**Pendientes/notas (futuro, no bloqueantes):** geocoding Nominatim client-side (proxy con caché para producción); ~~distancia geodésica (OSRM por carretera futuro)~~ *(resuelto con TomTom, ver 2026-06-08)*; UI de la matriz de compatibilidad (hoy por seed); motor evalúa todas las unidades activas (top-N a futuro); búsqueda del listado no cubre escalas intermedias; tests de integración de crear/editar; Carta Porte/Factura (Fase 2) deberán leer `CargaEscala`, no el resumen de `Viaje`.

### 2026-06-08 — Viajes: ruteo por carretera con TomTom + caché ✅

Rama `feat/tomtom-ruteo` (base `feat/viajes-multiescala`). El cálculo de distancia del itinerario pasa de **geodésica** (línea recta PostGIS) a **ruta real por carretera** vía **TomTom Routing API**, con degradación elegante.

**Arquitectura (`apps/api/src/infrastructure/routing/`):** interfaz `RouteProvider` con dos implementaciones — `GeodesicaRouteProvider` (PostGIS `ST_MakeLine/ST_Length`, fallback) y `TomTomRouteProvider` (`calculateRoute`, `travelMode=truck`, `traffic=false`) — orquestadas por `RouteService`. `MotorViajeService.distanciaKm` ahora delega en `RouteService` y propaga `metodoDistancia` (`GEODESICA`|`RUTA`) real al resultado (antes fijo en `GEODESICA`).

**Eficiencia / no repetir llamadas:** caché persistente en **`ruta_cache`** (migración `20260608120000_ruta_cache`), keyed por **hash sha1 de coordenadas ordenadas redondeadas a ~11 m** + perfil (`claveRuta`) → un pin movido unos metros pega en caché; rutas estables a largo plazo (traffic off). La key se usa **solo server-side** (nunca al navegador). **Tope diario defensivo** por instancia (`TOMTOM_MAX_DIARIO`, default 2000; free tier = 2500/día) que degrada a geodésica con aviso.

**Modelo de keys (instancia-por-cliente):** **una key de TomTom por cliente** (env `TOMTOM_API_KEY`) → cada instancia tiene su propio free tier (N×2,500/día) y aislamiento. `alta-cliente.sh` la inyecta si se pasa `TOMTOM_API_KEY=...` en el entorno; `.env.example` documentado. Sin key, todo sigue en geodésica (cero cambios de comportamiento).

**Frontend:** `PanelMotor` muestra etiqueta dinámica de distancia (**"Dist. carretera"** vs **"Dist. línea recta"**) según `metodoDistancia`.

**Verificado:** `tsc` API+web en verde; **18/18 tests** (9 motor + 9 nuevos de `route.service`: clave determinista/redondeo/orden, cache hit/miss, fallback por error y por tope diario); smoke en vivo `/viajes/evaluar` CDMX→QRO = 183.51 km `GEODESICA` (sin key en dev, fallback correcto).

**Trazo real + ETA (mismo día):** se extrae la **geometría** de la ruta (`legs[].points`) y se guarda en `ruta_cache.geometria` y como snapshot en `viajes.rutaGeometria` (migración `20260608130000_ruta_geometria`); el `MapaItinerario` la pinta siguiendo carreteras (fallback a líneas rectas si geodésica). Smoke real con key: crear CDMX→QRO = 216.76 km `RUTA`, polilínea persistida; 2ª llamada idéntica = cache hit (0 transacciones extra).

### 2026-06-08 — Viajes/ruteo: auditoría multiagente + 12 fixes ✅

Auditoría multiagente (4 dimensiones: funcionalidad/optimización, seguridad, datos/escalabilidad, código/mantenibilidad + síntesis) sobre la feature de TomTom. Hallazgo clave que el self-review subestimó: **`/viajes/evaluar` llamaba a TomTom en cada teclazo** del formulario (cada pin movido = cache miss = llamada real), quemando la cuota durante la edición. 12 fixes aplicados:

- **(Alta) Evaluar usa geodésica siempre:** flag `preferGeodesica` en `RouteService.calcular`/`distanciaKm`; el cálculo por carretera definitivo se hace solo al crear/editar. *Verificado: evaluar → `GEODESICA`, `ruta_cache` queda vacía.*
- **(Alta) Test de `TomTomRouteProvider`** (mock de `fetch`): parseo, dedup de tramos, errores HTTP/sin-ruta, tope diario con reset por día.
- **(Media) Poda de `ruta_cache`:** `@@index([createdAt])` + `purgarAntiguas(180d)` disparado oportunistamente 1×/día.
- **(Media) Geometría más liviana:** dedup del waypoint compartido entre tramos + simplificación Douglas-Peucker + redondeo a 6 decimales → **2,673 → 584 puntos (−78%)**.
- **(Media) ETA:** `tiempoMin` deja de ser dato muerto; se persiste en `viajes.tiempoEstimadoMin` y se muestra en el detalle (free-flow, sin tráfico en vivo).
- **(Media) `LimiteDiarioError`** (clase) en vez de control de flujo por string; **type guard `esGeometria`** para JSONB de caché; logging de errores de caché (P2002 distinguido).
- **(Baja) Contador diario best-effort** sembrado desde la BD (sobrevive reinicios); URL TomTom endurecida (`toFixed(6)`, key nunca logueada); helper `snapshotRuta` (DRY crear/editar); constantes nombradas; migración nueva idempotente (`IF NOT EXISTS`).

**Verificado:** `tsc` API+web en verde; **27/27 tests** (9 motor + 11 `route.service` + 7 `tomtom.provider`); migración `20260608140000_ruta_eta_retencion` aplicada; smoke en vivo: evaluar `GEODESICA` sin tocar caché, crear `RUTA` 216.76 km + ETA 197 min + geometría 584 puntos.

### 2026-06-08 — Viajes/ruteo: `departAt` con tráfico predicho ✅

La planeación usa tráfico **histórico/predicho** de TomTom para la **fecha programada** del viaje (sin romper el caché). Si `fechaProgramada` es **futura**, el ruteo va con `traffic=true&departAt=<ISO>` → ruta y ETA dependientes de la franja horaria; si es pasada o ausente, **flujo libre** (`traffic=false`, como antes). La evaluación en vivo del formulario sigue en geodésica (no toca TomTom).

**Cómo:** `OpcionesRuta.departAt` + `CalcularOpts.departAt` se threadean desde crear/editar (`fechaProgramada` efectiva: la nueva o la guardada) → `MotorViajeService.distanciaKm` → `RouteService` (valida que sea futura con `departAtValido`; **segmenta la clave de caché por hora** `TOMTOM|t=YYYY-MM-DDTHH` para que rutas de horas distintas no colisionen) → `TomTomRouteProvider` (arma la URL con `traffic`/`departAt`). Sin cambios de schema.

**Verificado:** `tsc` verde; **31/31 tests** (+4: URL con/sin `departAt`, forwarding y descarte de fecha pasada); smoke en vivo CDMX→QRO domingo 14:00 = **216.76 km / ETA 199 min** (predicho) vs **217.14 km / 209 min** (flujo libre) → 2 entradas de caché distintas, sin colisión. *(Hazard resuelto: el watcher había re-arrancado la API bajo Node 16 —sin `fetch` global—; se fija Node 20 con la ruta concreta en el PATH. Ver [[flotaos-entorno-node]].)*

### 2026-06-08 — Viajes: plan multi-día (llegada estimada) que asigna el monitorista ✅

El detalle del viaje muestra la **fecha/hora estimada de llegada** repartiendo el tiempo de conducción en jornadas, y el **monitorista asigna por viaje** los parámetros: horas de conducción/día, descanso entre días, tiempo por escala y hora de inicio diaria.

**Backend:** columna `Viaje.planRuta` (JSONB, migración `20260608150000_viaje_plan_ruta`); `PATCH /viajes/:id/plan-ruta` (`PlanRutaDto` con rangos validados; `AdminGuard`) → `ActualizarPlanRutaUseCase` (se puede ajustar en cualquier estado; no toca itinerario ni snapshot). Cableado en `ViajesService`/módulo/controller.

**Frontend:** modelo puro `plan-ruta.ts` (`planificarRuta` en hora **local** del navegador: reparte la conducción en jornadas de ≤`horasConduccionDia`, descanso reanudando a `horaInicio`, + `minutosPorEscala`×escalas; defaults 9h/11h/60min/08:00); `PlanRutaDialog` con **previsualización en vivo** de la llegada; tarjeta "Plan de viaje" en el detalle (llegada, días de conducción, desglose conducción/descansos/escalas). El grid del snapshot ahora rotula la conducción pura como **"Conducción"**.

**Verificado:** `tsc` API+web verde, 31/31 tests; sanity-check del modelo (CDMX→QRO 1 jornada llega 13:37; 30 h → 4 jornadas, 45 h descanso; 45 h → 5 jornadas); smoke en vivo: `PATCH plan-ruta` persiste el JSON y valida (`horaInicio=24` → 400); detalle web 200.

### 2026-06-08 — Cotizaciones: motor de cálculo + crear/previsualizar (Fase 1) ✅

Cotización de un viaje con **motor de cálculo "mixto configurable"**. Fase 1 de 3 (Fase 2: documento PDF; Fase 3: envío por correo con Brevo —scaffold pendiente—).

**Motor (dominio puro, `domain/cotizacion/motor-cotizacion.ts`, 6/6 tests):** arma líneas de concepto — flete base + $/km + $/kg + **combustible** (distancia ÷ rendimiento × precio diésel) + casetas + maniobras×escalas — aplica **margen %**, luego **IVA 16%** y **retención 4%** (ISR flete). Todos los parámetros se capturan por cotización.

**Datos:** modelo `Cotizacion` (`folio`, `estado` BORRADOR/ENVIADA/ACEPTADA/RECHAZADA, `params`/`desglose` JSONB, totales Decimal, FK a Viaje; migración `20260608160000_cotizaciones`). El create congela los datos del viaje (km/kg/escalas) y el desglose.

**API:** `CotizacionesModule` — `POST /cotizaciones/calcular` (previsualización sin persistir), `POST /viajes/:id/cotizaciones` (crea tomando datos del viaje), `GET /viajes/:id/cotizaciones`, `GET /cotizaciones/:id` (`JwtAuthGuard + AdminGuard`).

**Web:** `CotizarDialog` (form de tarifas + **previsualización del desglose en vivo** vía `/calcular` con debounce) y `CotizacionesCard` en el detalle del viaje (lista + estado + total en MXN).

**Verificado:** `tsc` API+web verde, **37/37 tests**; smoke en vivo: `calcular` = total $13,977.60 (= test unitario); `crear` congela datos reales del viaje (folio 1, total $14,737.79); lista OK; detalle web 200.

### 2026-06-08 — Cotizaciones: documento PDF (Fase 2) ✅

Generación del **PDF** de la cotización (server-side con `pdfkit`, sin Chromium → apto para el Docker Alpine).

- `infrastructure/pdf/cotizacion-pdf.ts`: encabezado del **emisor** (datos por **env por instancia**: `EMPRESA_NOMBRE/RFC/DIRECCION/TELEFONO/EMAIL`), datos del **cliente** (del viaje), resumen del viaje (origen→destino, km, peso, escalas), tabla de conceptos con detalle, totales (subtotal/margen/IVA/retención/total) y disclaimer "no es CFDI".
- `GET /cotizaciones/:id/pdf` → `StreamableFile` (`application/pdf`, `inline; filename`). Web: botón **PDF** por cotización que lo descarga vía blob autenticado.
- `.env.example` + `.env` dev con las vars `EMPRESA_*`.

**Verificado:** `tsc` API+web verde; smoke en vivo: PDF **1 página**, `%PDF-1.3`, Content-Type/Disposition correctos; `pdftotext` confirma emisor (env), cliente+RFC, folio/fecha y totales.

### 2026-06-08 — Correo reutilizable + envío de cotización con Brevo (Fase 3) ✅

**Servicio de correo reutilizable** (`EmailModule`, sin duplicar código): se refactorizó el `EmailService` (antes SMTP suelto en AlertasModule) a un módulo con **providers intercambiables** — `SmtpMailProvider` (Nodemailer) y `BrevoMailProvider` (API transaccional) — detrás de la interfaz `MailProvider`. `EmailService` elige el activo (**Brevo si hay `BREVO_API_KEY`, si no SMTP**), soporta **adjuntos** y nunca propaga errores (devuelve `boolean`). `AlertasModule` y `CotizacionesModule` ahora **importan `EmailModule`** (alertas dejó de re-proveerlo).

**Envío de cotización:** `POST /cotizaciones/:id/enviar` (`EnviarCotizacionDto` con `to` opcional → default al `contactoEmail` del cliente) genera el PDF, lo adjunta y envía vía `EmailService`; si sale, marca `estado=ENVIADA` + `enviadaEn`. Web: diálogo **"Enviar"** por cotización. `.env.example`: `EMAIL_FROM`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL/NAME`.

**Verificado:** `tsc` API+web verde, 37/37 tests; API bootea con el módulo compartido (DI OK); smoke: envío sin Brevo/mailserver dev → **503 limpio** identificando el proveedor activo (no marca ENVIADA), correo inválido → 400. **Envío en vivo OK (2026-06-08):** con `BREVO_API_KEY` real + remitente verificado (`desarrollosdavidg@gmail.com`), correo enviado vía Brevo con el PDF adjunto, cotización marcada ENVIADA. *(La cuenta tenía restricción de "IPs autorizadas"; se autorizó la IP.)*

### 2026-06-08 — Cotizaciones: PDF (UI) + auditoría del motor + pass-through ✅

**PDF (UI/UX):** direcciones origen/destino en fuente menor (8 pt) y etiquetadas; la tabla arranca dinámicamente debajo del bloque cliente/viaje (`heightOfString`, ya no se encima con direcciones largas); tabla de conceptos rediseñada (banda de encabezado, filas zebra, columna de importe alineada, alto de fila dinámico).

**Auditoría del motor de cotización + fixes:** C3 preview↔guardado del peso unificado (`??` en ambos); C4 detalle de combustible como fórmula (consistente con el monto); C6 topes superiores en el DTO (frenan typos, p. ej. diésel→400); C8 +3 tests (NaN/negativos, todo-en-0, redondeo). El motor estaba correcto en lo esencial (matemática, orden, base de IVA/retención, arquitectura pura sin duplicar).

**Cambio de negocio — margen solo al servicio:** el margen aplica únicamente al **servicio** (flete + km + kg + maniobras); **combustible y casetas van a costo** (pass-through, flag `pasaCosto`, sin margen pero suman al total). Se refleja en el desglose del diálogo y el PDF ("a costo" / "Margen s/ servicio").

**Verificado:** `tsc` API+web verde, **41/41 tests**; smoke `calcular` = total **$13,440** (margen $1,600 = 20% s/ servicio $8,000; casetas/combustible a costo); PDF regenerado 1 página; tope DTO diésel 2400 → 400.

### 2026-06-08 — Cotizaciones: editar borradores ✅

`PATCH /cotizaciones/:id` — edita una cotización **solo si está en BORRADOR** (si no, **409**); recalcula con el motor tomando los datos del viaje y actualiza el snapshot. Refactor del servicio: `crear` y `editar` comparten `datosViaje()` + `snapshot()` (sin duplicar). Web: el `CotizarDialog` ahora es reutilizable en modo edición (precarga params/notas, PATCH, etiquetas "Editar"/"Guardar cambios") y la tarjeta muestra el botón **Editar** solo en cotizaciones en borrador.

**Verificado:** `tsc` API+web verde; smoke: editar borrador → 200 (total recalculado, sigue BORRADOR), editar enviada → **409**; detalle web 200.

### 2026-06-08 — Cotizaciones: input numérico robusto + envío a varios correos ✅

**`NumberField` (UI):** componente reutilizable de input numérico que arranca **vacío** cuando el valor es 0 (placeholder "0") y maneja su propio texto mientras está enfocado → se acabó el "05334" al editar (el `select()` en focus no bastaba: el clic de mouse lo deshacía). Permite vaciar y teclear decimales. Aplicado a los inputs del diálogo de cotización y del plan de viaje.

**Envío a múltiples destinatarios:** `EnviarCotizacionDto.to` pasa de `string` a `string[]` (`@IsEmail each`, `@ArrayMaxSize(20)`); el `MensajeCorreo.to` del servicio de correo reutilizable acepta `string | string[]` (Brevo → array de `{email}`; SMTP → join por comas). El servicio dedup y cae al `contactoEmail` del cliente si la lista va vacía. Web: el diálogo "Enviar" ahora es un **multi-correo** (input + "Agregar" + chips removibles).

**Verificado:** `tsc` API+web verde; smoke en vivo: envío a **2 correos** vía Brevo (201, ENVIADA; log confirma ambos destinatarios), correo inválido en la lista → 400.

---

## Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| GPS background en iOS / Android | Alto | Validar en dispositivos reales desde Fase 1. `flutter_background_service` + `geolocator` sin costo |
| Cambios en complemento Carta Porte SAT | Alto | Delegar al PAC. Monitorear versiones activamente |
| Gestión manual de múltiples instancias Docker | Medio | Documentar y scripting del proceso de alta desde el inicio. Fase 3: panel de administración |
| Sync offline del conductor | Medio | Cola local `drift` (SQLite), last-write-wins para el MVP |
| Socket.io bajo carga por instancia | Bajo | Un nodo por instancia cubre el MVP. Redis Adapter si escala |

---

## Fuera del alcance del MVP

- Multi-tenancy (una BD compartida para todos los clientes)
- Procesamiento de pagos / dispersión a conductores
- App para cliente final (solo link de tracking sin login)
- Roles y permisos granulares (Fase 2)
- Integración con ERP o sistemas externos
- Soporte LatAm / cross-border
- Microservicios

---

*FlotaOS MVP — documento de análisis y decisiones de arquitectura. v1.0*
