# Auditoría FlotaOS — API + Web

**Fecha:** 2026-06-24
**Alcance:** `apps/api` (NestJS 10, Clean Architecture, Prisma 6) y `apps/web` (Next.js 14 App Router, React Query, shadcn). **No incluye** móvil.
**Método:** 6 auditorías paralelas (arquitectura API, seguridad/QA API, performance API, arquitectura web, performance/QA web, buenas prácticas + legibilidad IA).

---

## Veredicto general

El proyecto está **por encima de la media** en calidad: dominio puro y aislado, controllers delgados, tipado fuerte real (≈0 `any` en producción), comentarios que explican el *porqué* de negocio, y `shared-types` usado de verdad como contrato compartido. **No hay vulnerabilidad crítica de seguridad** (la arquitectura es *single-tenant instancia-por-cliente*, no multi-tenant de BD compartida, por lo que no existe riesgo de fuga cross-empresa) ni endpoints de negocio sin autenticar.

Los problemas dominantes son tres, ninguno bloqueante pero todos con alto ROI:

1. **Duplicación masiva de boilerplate CRUD** — los 9 sub-recursos del expediente del conductor están clonados casi carácter por carácter, en backend (~1.900 líneas) y en frontend (~3.000 líneas). Es la mayor oportunidad de reducción del proyecto.
2. **Higiene de tooling rota** — ESLint/Prettier están referenciados en los scripts pero **no instalados ni configurados**; el build de web ignora ESLint; la API no usa `strict: true`. La consistencia hoy es "por disciplina", no garantizada.
3. **Robustez frontend** — 0 error boundaries, 0 tests en web, y una ráfaga de requests en la vista de tracking que no escala.

---

## TOP prioridades (orden de ejecución recomendado)

| # | Severidad | Área | Hallazgo | Esfuerzo |
|---|-----------|------|----------|----------|
| 1 | 🔴 Alta | API | Sin filtro global de excepciones → fuga de errores Prisma | Bajo |
| 2 | 🔴 Crítico | Web | Sin Error Boundaries (`error.tsx`) en toda la app | Bajo |
| 3 | 🔴 Crítico | Web | Tracking: O(N) requests en serie + re-renders en ráfaga | Medio |
| 4 | 🔴 Alta | Tooling | ESLint/Prettier rotos; `strict:true` ausente en API | Medio |
| 5 | 🟠 Alta | API | PDF + email de cotización síncronos bloquean el request | Medio |
| 6 | 🟠 Alta | Web | Ciclo de vida frágil del socket (`getSocket`) | Bajo |
| 7 | 🟠 Alta | Web | RBAC `useSoloLectura` inconsistente (conductores no lo aplica) | Bajo |
| 8 | 🟠 Media | API+Web | **Duplicación CRUD expediente** (~4.900 líneas) | Alto |

---

## 1. Seguridad y QA (API)

> Nota: el sistema es **single-tenant** (modelo `Empresa` singleton, sin `empresaId` en ningún modelo). El aislamiento es por despliegue, no por query → **no hay riesgo de fuga cross-empresa**. El scoping conductor↔viaje (que un conductor no acceda a viajes ajenos) **sí está bien implementado** en GPS, chat y WS.

### 🔴 Alto — Sin filtro global de excepciones
`main.ts` / `app.module.ts:52` — No existe `ExceptionFilter` global ni `APP_FILTER`. Errores Prisma (`P2002`/`P2025`), MinIO o `TypeError` caen al handler por defecto y pueden **filtrar nombres de campos/tablas y stack**.
→ Añadir `AllExceptionsFilter` global que mapee `Prisma.PrismaClientKnownRequestError` a 409/404/400 genéricos sin exponer `meta`/stack.

### 🟡 Medio — Validación de adjuntos confía en el `mimetype` declarado
`chat.usecase.ts:90`, `archivos-unidad.usecase.ts:67` — La whitelist valida `archivo.mimetype`, que es falsificable (header del cliente). Mitigado por keys UUID y URLs presigned.
→ Validar por firma de bytes (magic-byte, p.ej. `file-type`) además del mimetype.

### 🟡 Medio — Cobertura de tests de autorización: cero
11 specs, todos de dominio/cálculo. **No hay ni un test** de `AdminGuard`/RBAC, scoping conductor↔viaje en chat/tracking, rotación de refresh token, ni e2e. Para un SaaS, la lógica de autorización es la más crítica y está sin probar.
→ Specs de `AdminGuard` (ADMIN vs MONITORISTA vs conductor), scoping en chat/WS, y un e2e mínimo login→endpoint protegido→403.

### 🟢 Bajos
- **Enumeración de usuarios por timing** en login (`login-admin.usecase.ts:20`): no ejecuta bcrypt si el email no existe → diferencia de latencia. Mitigado por throttle 10/min. → comparar siempre contra un hash dummy.
- **Ingesta GPS con `@SkipThrottle()`** (`ubicacion.controller.ts:28`): verificar `@ArrayMaxSize` en el DTO de lote.
- **MONITORISTA puede mutar viajes y cotizaciones** (`viajes.controller.ts`, `cotizaciones.controller.ts:22`): parece **intencional** según el diseño — confirmar explícitamente.

### ✅ Bien hecho (verificado)
JWT con secretos distintos access/refresh y fail-fast si faltan; rotación de refresh token correcta (hash SHA-256+bcrypt, rotado en cada uso); cookies `httpOnly`+`secure`+`sameSite:strict`; WS autenticado por handshake JWT con autorización por sala; `ValidationPipe` global con `whitelist`+`forbidNonWhitelisted`; sin inyección SQL (los 3 `$queryRaw` usan tagged templates); storage sin path traversal (keys UUID, URLs presigned); secretos PAC/CSD cifrados AES-256-GCM; headers de seguridad + CORS por env + rate limiting en capas.

---

## 2. Performance (API)

### 🟠 Alto — PDF + email de cotización síncronos bloquean el request
`cotizaciones.service.ts:361` (`enviar`) y `:299` (`generarPdf`) — Dentro del request: render PDFKit (CPU) → `empresa.findFirst` (×2, duplicado en `:251` y `:362`) → SMTP (cientos de ms–segundos) → `update`, todo en serie. BullMQ existe pero solo se usa para el escaneo diario de vencimientos.
→ Mover PDF+email a un job BullMQ; el endpoint responde 202 y el panel recibe el resultado por WS/polling. Mínimo: deduplicar las dos lecturas de `empresa`.

### 🟠 Alto — N+1 de URLs prefirmadas en historial de chat
`chat.usecase.ts:65,227` — Una URL presigned de MinIO por mensaje con adjunto, y `findMany` **sin paginar** (trae todo el historial). Chat de 200 imágenes = 200 firmados al abrir.
→ Paginar con cursor por `createdAt` (índice `[viajeId, createdAt]` ya existe), acotar a ~30-50 por página.

### 🟡 Medio — Escritura a BD + geocercas PostGIS en cada ping de GPS
`registrar-ubicacion.usecase.ts:81,144` — Cada ping inserta fila **y** ejecuta `ST_DWithin` + 2 queries por cada escala. `ubicaciones_conductor` crece sin límite ni purga.
→ (a) cortocircuitar `evaluarGeocercas` cuando todas las escalas ya están notificadas; (b) job de purga/retención (>90 días); (c) favorecer el endpoint de lote.

### 🟡 Medio — Índices faltantes
- `mensajes_chat`: el `groupBy`/`updateMany` del badge global (`where autorTipo, leidoMonitorista`) hace **seq scan** (único índice es `[viajeId, createdAt]`). → `@@index([autorTipo, leidoMonitorista])` y `@@index([autorTipo, leidoConductor])`.
- `viajes`: búsqueda `q` con `ILIKE %term%` multi-columna + join → seq scan. → índice GIN `pg_trgm` a volumen alto (migración cruda).

### 🟢 Bajos
- `obtenerViaje` detalle carga `historial`/`historialAsignaciones`/`incidencias` sin `take` → acotar a últimos 50.
- Pool de Prisma sin `connection_limit` explícito (HTTP+WS+BullMQ comparten el mismo cliente) → fijar `connection_limit`/`pool_timeout`; PgBouncer si se escala horizontalmente.

### ✅ Bien hecho
`paginar()` con `count+findMany` en `Promise.all` y tope 100; caché de ruteo persistente con purga 30d y manejo de carrera P2002; lote de ubicaciones con `createManyAndReturn`; email de llegada fire-and-forget; listados con `select` explícito; WS por salas (sin broadcast global). `viajes` está bien indexado.

### Índices recomendados (resumen)
| Tabla | Índice | Motivo |
|---|---|---|
| `mensajes_chat` | `@@index([autorTipo, leidoMonitorista])` + `([autorTipo, leidoConductor])` | badge no-leídos (hoy seq scan) |
| `viajes`(+`clientes`) | GIN `pg_trgm` en columnas de búsqueda | `ILIKE %q%` (migración cruda) |
| `ubicaciones_conductor` | (no índice) **job de retención** | crece sin límite |

---

## 3. Arquitectura, duplicación y escalabilidad (API)

### 🟠 Alto — 9 sub-CRUD de expediente clonados (~1.900 líneas)
`application/conductores/expediente/*.usecase.ts` (capacitaciones, certificaciones, evaluaciones, examenes-medicos, ausencias, incidencias, control-confianza, eventos-laborales, aptitudes-unidad). Estructura idéntica + controller calcado + module propio; difieren solo en modelo Prisma y lista de campos.
→ Extraer `ExpedienteSubrecursoService<TModel>` base + factory de controller (NestJS `mixin`). Reduce a 9 configs de ~30 líneas. Ya existe el precedente correcto: `asegurar-conductor.ts`.

### 🟡 Medios
- **`find-or-404` duplicado 41 veces** en 27 archivos → helper `obtenerOFallar(delegate, where, label)` en `application/shared/`.
- **Construcción manual `if (input.x !== undefined)`** en todos los `actualizar` → util `asignarDefinidos(data, input, campos[])`.
- **Triple definición del mismo shape** (Prisma model + DTO + `interface *Input` en `*.types.ts`) → consumir el DTO directamente o derivar con `Pick`/`Omit`.
- **Acceso a Prisma directo sin patrón repositorio** en ~56 archivos: pragmático para MVP, pero limita testabilidad y filtra `Prisma.*WhereInput` por la capa de negocio. Considerar puertos solo para agregados ricos (viajes, cotizaciones).
- **`cotizaciones.service.ts` (403 líneas)** mezcla cálculo+persistencia+máquina de estados+escape HTML+email → mover `escaparHtml` y render de email a `infrastructure/email`.

### 🟢 Bajos
- **`listar-*.dto.ts` reinventan paginación** pese a existir `PaginacionDto` → `extends PaginacionDto`.
- **Tres convenciones conviviendo** (un usecase por archivo / usecase agrupado / service) → estandarizar a service agrupado para CRUD planos.

### ✅ Bien hecho
Dominio puro (motores de cálculo/cotización sin framework); controllers delgados; presentación sin Prisma; `paginar()` y `asegurarConductorExiste()` como extracciones modelo; `PartialType` en 15 DTOs; `ViajesService` como fachada (no God service); invariante "último admin" bien ubicada.

### Quick wins de reducción (API)
1. `extends PaginacionDto` en los 4 listar-DTOs (~48 líneas, riesgo nulo).
2. Helper `obtenerOFallar` (~30 bloques).
3. Util `asignarDefinidos` (~15 bloques).
4. Base genérica de los 9 sub-CRUD (~1.5k líneas).
5. Eliminar interfaces `*Input` espejo.

---

## 4. Arquitectura, duplicación y escalabilidad (Web)

### 🟠 Alto — 9 tabs de expediente clonados (~3.000 líneas)
`components/conductores/expediente/*-tab.tsx` — Mismo esqueleto íntegro (query+mutaciones+RHF+reset+estados+tabla+diálogo de archivos); solo cambian endpoint, schema y columnas. Hay copy-paste literal (`capacitaciones-tab.tsx:155-173` repite los `defaultValues`).
→ `<ExpedienteSeccion>` / `useSeccionExpediente({ seccion, schema, columnas, toPayload })`. Reduce ~3.000 → ~600 líneas. **Mayor ROI del proyecto** (junto al equivalente API).

### 🟠 Alto — List pages CRUD duplicadas (no hay `<DataTable>`/`useCrudList`)
`clientes/conductores/flota/cajas/usuarios/page.tsx` — Misma estructura (busqueda+debounce+useQuery paginado+eliminar+header+tabla+footer). Inconsistencia: queryKey a veces objeto, a veces tupla posicional.
→ `useCrudList<T>({ recurso, queryKey, pageSize })` + `<CrudListShell>`.

### 🟠 Alto — RBAC `useSoloLectura` inconsistente (posible bug)
`conductores/page.tsx` **no** usa `useSoloLectura`: botones Nuevo/Editar/Eliminar se muestran a un MONITORISTA (rol de solo lectura). Solo flota/cajas lo aplican. La defensa real está en backend (`@Roles`), pero la UI filtra acciones que fallarán con 403.
→ Gatear crear/editar/eliminar con `soloLectura` en todas las list pages; centralizar en `useCrudList`.

### 🟡 Medios
- **Tipos de entidad redefinidos localmente** (Cliente, Conductor, Unidad, Viaje) en vez de derivar de `shared-types` → mover entidades "vista pública" a `@flotaos/shared-types`; forms con `z.infer`.
- **Query keys como strings literales** (90+ sin factory) → extender `lib/query-keys.ts` a factory tipado.

### 🟢 Bajos
- Diálogos de adjuntos (3 implementaciones) → `ArchivosDialogBase` (el `DocumentosDialogBase` ya es el patrón a replicar).
- `viajes/[id]/page.tsx` (511 líneas) → extraer barra de acciones y bloque de datos.
- `'use client'` universal (97/97): coherente para un panel SPA autenticado, pero no aprovecha RSC. Documentar como decisión consciente.

### ✅ Bien hecho
`lib/api.ts` interceptor con refresh deduplicado + cookies httpOnly; `useEntityFormDialog`, `DocumentosDialogBase`, `EstadoTabla`, `PaginacionFooter`, `useCatalogo`, helpers de `validacion.ts` — abstracciones limpias a replicar.

### Quick wins de reducción (Web)
1. `<ExpedienteSeccion>` (~3.000 → ~600).
2. `useCrudList` + `<CrudListShell>` (unifica list pages + arregla RBAC).
3. **`isoADate`/`dateAIso` a `lib/fecha.ts`** (hoy redefinido en 11 archivos — trivial).
4. Factory de query keys.
5. Entidades a `shared-types` + `z.infer` en forms.

---

## 5. Performance, QA y robustez (Web)

### 🔴 Crítico — Sin Error Boundaries
No existe ningún `error.tsx`/`global-error.tsx`. Una excepción de render (un `cliente` null sin optional chaining, fallo del SDK de Maps) deja **pantalla en blanco** sin recuperación.
→ `app/(panel)/error.tsx` (con `reset()`) + `app/global-error.tsx`.

### 🔴 Crítico — Tracking: O(N) requests en serie + re-renders en ráfaga
`tracking/page.tsx:141-158` — `cargarPosicionInicial` hace **2 requests secuenciales por cada viaje activo**; con `pageSize:100` → hasta 200 peticiones en `Promise.all`. Cada evento WS re-renderiza la página y el `<Mapa>` enteros.
→ Endpoint batch `GET /tracking/posiciones-activas`; memoizar la lista al mapa; throttle de posiciones (1/seg por viaje).

### 🟠 Altos
- **`staleTime` global 15s + polling agresivo**: dashboard hace polling 20s de `viajes?pageSize=100` + `alertas/vencimientos`; tracking refetch 60s. → endpoint de agregados `GET /dashboard/metricas` en vez de traer 100 filas.
- **`AuthContext` recrea el value cada render** (`auth.tsx:61`), envuelve toda la app → `useMemo`/`useCallback` (como ya hace `NotificacionesProvider`).
- **`getSocket()` frágil** (`socket.ts:20`): destruye y recrea un socket en estado `connecting` → usar `socket.connected || socket.active`.
- **Mapa sin `dynamic import`** en detalle de viaje (`mapa-itinerario.tsx`, `mapa-viaje-card.tsx`); solo tracking lo hace → envolver en `dynamic(..., {ssr:false})`.

### 🟡 Medios
- `next/image` sin usar → `<img>` crudas sin `width/height` (CLS); `next.config.mjs` sin `images.remotePatterns`.
- `next.config.mjs:5` ESLint ignorado en build; sin `compiler.removeConsole`.
- Conductores sin `keepPreviousData` → parpadeo al paginar (viajes sí lo tiene).
- `useMarcador` destruye+recrea el marker en cada tick de GPS en vez de `setPosition()` (`map-picker-google.tsx` ya lo hace bien).
- Manejo de errores inconsistente (chat sin `isError` en UI) → `QueryCache({ onError })` global.
- Ciclo de vida de suscripciones WS frágil (`use-viaje-en-vivo.ts:58`) → refcount por `viajeId` en `socket.ts`.

### 🟢 Bajos
`APIProvider` de Maps global en todas las rutas; `marcarLeido` sin debounce (N POSTs en ráfaga); accesibilidad (`alt` genéricos, falta `aria-live` en contador de señal); fechas sin TZ de negocio explícita (America/Mexico_City).

### Prioridad de testing (0 tests hoy)
1. `lib/api.ts` interceptor de refresh. 2. `lib/socket.ts` ciclo de vida. 3. `lib/notificaciones` dedupe. 4. `lib/fecha.ts`. 5. zod `viajeFormSchema`. 6. E2E Playwright del flujo de tracking.

---

## 6. Buenas prácticas y legibilidad para IA

| Métrica | API | Web |
|---|---|---|
| `any`/`as any` | 6 (5 en specs) | **0** |
| `@ts-ignore` | 0 | 0 |
| `console.*` | 0 | 1 (SW) |
| TODO/FIXME reales | 1 | 1 |
| imports `shared-types` | 28 | 28 |

### 🔴 Alta — ESLint/Prettier referenciados pero NO instalados ni configurados
Los scripts `lint` de ambas apps invocan `eslint`/`next lint` pero **no existe eslint en node_modules** ni `.eslintrc*`/`eslint.config.*` ni `.prettierrc`. `next.config.mjs:5` ignora ESLint en build. La consistencia actual es "por disciplina", frágil.
→ Instalar `@typescript-eslint` + `eslint-config-next` + Prettier con config compartido en raíz; quitar `ignoreDuringBuilds` (o moverlo a CI). Si no se usará, borrar los scripts `lint`.

### 🟠 Media-alta — `tsconfig` de API sin `strict: true`
`apps/api/tsconfig.json:15-19` activa flags sueltos pero no `strict`. La web sí tiene `"strict": true`.
→ `"strict": true` en API + `noUncheckedIndexedAccess`.

### 🟡 Media — Env sin validación centralizada
61 accesos a `process.env.*` en 18 archivos; `ConfigModule.forRoot` sin `validationSchema`; defaults mágicos dispersos.
→ `env.validation.ts` con zod/joi en `ConfigModule` + acceso vía `ConfigService` tipado.

### 🟡 Baja-media — Enums Prisma no espejados en shared-types
Faltan `RolUsuario`, `EstadoCotizacion`, `CategoriaArchivoUnidad`, `SeccionExpediente`, `AutorMensaje`; algunos duplicados como string-union ad-hoc (`AutorMensajeChat`).
→ Añadir los enums que cruzan back↔front (mínimo `RolUsuario`, `EstadoCotizacion`) o generar shared-types desde Prisma.

### ✅ Positivos (legibilidad IA)
- **Mezcla español/inglés CONSISTENTE** (verbos técnicos EN + dominio ES, sufijos `.usecase/.service/.dto`, rutas/enums en español).
- **Comentarios "porqué" de alta calidad** (transiciones de estado, geocercas PostGIS, fail-fast, contratos "SERIALIZADOS").
- **TODO/dead code mínimo**; cero código comentado.

### Top 5 mejoras para legibilidad IA
1. Instalar y configurar ESLint + Prettier de verdad.
2. `strict: true` en `apps/api/tsconfig.json`.
3. Documentar la convención de nombres en `CLAUDE.md`/`CONTRIBUTING.md`.
4. Validación de env centralizada con zod/joi.
5. Cerrar el drift de enums shared-types ↔ Prisma.

---

## Plan de acción sugerido (por fases)

**Fase A — Higiene y seguridad (rápido, alto valor):**
1. Filtro global de excepciones (API). 2. Error boundaries (web). 3. ESLint+Prettier+`strict:true`. 4. `useSoloLectura` en todas las list pages. 5. `isoADate` a `lib/fecha.ts`. 6. `extends PaginacionDto`.

**Fase B — Performance:**
7. PDF+email de cotización a BullMQ. 8. Endpoint batch de tracking + memoización. 9. Paginar historial de chat. 10. Endpoint de agregados del dashboard. 11. Índices de chat + job de purga de ubicaciones. 12. Endurecer `getSocket`/suscripciones WS.

**Fase C — Reducción de código (mayor ROI estructural):**
13. `ExpedienteSubrecursoService` (API) + `<ExpedienteSeccion>` (web) → ~4.900 líneas.
14. `useCrudList`/`CrudListShell` + helpers `obtenerOFallar`/`asignarDefinidos`.
15. Entidades a `shared-types` + factory de query keys.

**Fase D — QA:**
16. Tests de autorización/RBAC + e2e (API). 17. Tests de `api.ts`/`socket.ts`/`fecha.ts` + E2E tracking (web).

---

## Estado de aplicación (2026-06-24, rama `auditoria/fixes-2026-06-24`)

Resuelto en 4 lotes paralelos con verificación entre cada uno. **Net de código fuente: −893 líneas** (a pesar de añadir tests, boundaries, filtro y validaciones). Verificación final **toda en verde**: API `tsc` ✓, web `tsc` ✓, **API jest 99/99** ✓, **web vitest 39/39** ✓, `nest build` ✓, `next build` (con lint activo) ✓, ESLint API 0 errores, `next lint` 0 errores.

### ✅ Aplicado
- **Seguridad/QA API:** filtro global de excepciones (`all-exceptions.filter.ts`, mapea errores Prisma sin filtrar internos); validación de adjuntos por magic-byte (`validar-archivo.ts`); cierre del timing side-channel de login (bcrypt dummy); validación centralizada de env (`env.validation.ts` con class-validator en `ConfigModule`).
- **Tests:** API — `admin.guard.spec`, `chat.usecase.spec`, `registrar-ubicacion.usecase.spec`, `refresh-token.usecase.spec` (autorización/RBAC, antes sin cubrir). Web — Vitest configurado desde cero + tests de `fecha`, `socket` (ciclo de vida + refcount), `notificaciones`.
- **Robustez web:** error boundaries (`error.tsx` + `global-error.tsx`); `useMemo`/`useCallback` en `AuthContext`; `getSocket` endurecido (`connected || active`); refcount de suscripciones WS; `dynamic import` del mapa en detalle de viaje; `keepPreviousData` en conductores; `QueryCache.onError` global.
- **RBAC web:** `useSoloLectura` consistente (conductores y demás CRUD).
- **Performance API:** índices de no-leídos del chat (migración `20260624120000_chat_indices_no_leidos`); paginación por cursor del historial de chat (API + web); cortocircuito de geocercas PostGIS en pings sin pendientes; `take` en historiales del detalle de viaje.
- **Reducción de código:** `ExpedienteSubrecursoService<T>` (9 usecases API → base + config, ~330 líneas menos) y `useSeccionExpediente` (9 tabs web, ~650 líneas netas menos); helpers `obtenerOFallar`/`asignarDefinidos`; `extends PaginacionDto`; `isoADate`/`dateAIso` unificados en `lib/fecha.ts`.
- **Contratos/tooling:** enums `RolUsuario`/`EstadoCotizacion`/`AutorMensaje` en `shared-types` (patrón `as const` para interoperar con Prisma); ESLint + Prettier configurados y verdes; `ignoreDuringBuilds` retirado (lint cuenta en build).

### ✅ Diferidos — también aplicados (2ª pasada)
- **Cotizaciones PDF+email → BullMQ:** nueva `CotizacionesQueue` + `CotizacionesWorker`; lógica extraída a `procesarEnvio()`; endpoint `enviar` responde **202** `{ encolada }`; **fallback síncrono si Redis está caído** (el envío nunca se pierde); evento WS `COTIZACION_ACTUALIZADA` a la sala admin; panel adaptado (toast + invalidación por WS). `generarPdf`/descarga sigue síncrono.
- **Índice GIN `pg_trgm` para búsqueda de viajes:** migración `20260624130000_busqueda_trigram_viajes` (5 índices trigram) **aplicada y verificada en BD**.
- **Job de purga/retención de `ubicaciones_conductor`:** job repetible diario (3 AM, retención 90 días) añadido al worker de alertas.
- **`strict: true` en `apps/api/tsconfig.json`:** activado — **compila con 0 errores** (el código ya era strict-clean, sin cambios necesarios).
- **Migraciones aplicadas a la BD:** `prisma migrate deploy` ejecutado; índices de no-leídos del chat + trigram verificados (`pg_indexes`). La API arranca limpia (DI/colas/WS sin errores).

### ⏸ No aplicado (decisión consciente)
- **Patrón repositorio (puertos):** se mantiene Prisma directo — pragmático y adecuado para el MVP; introducir una capa de mapeo no compensa hoy. (Recomendado solo si se busca escalar tests/equipo.)

### ⚠️ Nota operativa sobre cotizaciones async
Con la cola activa, los errores de `procesarEnvio` (correo caído, etc.) ya no llegan como 4xx/5xx al usuario: ocurren dentro del job y disparan los reintentos de BullMQ (quedan en logs). En el camino de *fallback* síncrono sí se propagan como antes. Conviene una verificación funcional end-to-end (enviar una cotización con Redis+SMTP reales) antes de producción.
