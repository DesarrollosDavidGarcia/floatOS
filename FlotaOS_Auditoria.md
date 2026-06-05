# Auditoría de código — FlotaOS

**Fecha:** 2026-06-05
**Alcance:** `apps/api` (NestJS, ~7.3k LoC) + `apps/web` (Next.js, ~11.7k LoC) + `packages/shared-types`.
**Foco:** legibilidad, limpieza, reducción de código, optimización y mantenibilidad (+ seguridad/correctitud donde apareció).
**Método:** auditoría multiagente (6 agentes en paralelo por rebanada) + verificación manual de los hallazgos críticos.

> Convención de etiquetas:
> **[SEGURO]** = fix de bajo riesgo (apto para aplicar de inmediato).
> **[RIESGOSO]** = refactor mayor o cambio de comportamiento (requiere pruebas antes de mergear).
> **[APLICADO]** = corregido en esta pasada.

---

## Veredicto general

La base está **bien arquitecturada**: Clean Architecture real en el API (un use case por archivo, tipos públicos que ocultan campos sensibles, helpers compartidos `paginar`/`fecha.util`/`token.util` bien reutilizados), y un frontend ordenado (interceptor de refresh centralizado, defaults sensatos de TanStack Query, cleanup correcto de sockets/listeners). No hay N+1 clásicos ni `console.log` olvidados.

El problema **dominante y transversal** es **duplicación estructural masiva** generada por los 9–11 sub-recursos del expediente del conductor, replicada en las 4 capas (use cases → controllers → DTOs → tabs de UI). Reducirla es la mayor palanca de mantenibilidad y recorte de líneas del proyecto (estimado **~1.500–2.000 líneas eliminables**).

Además aparecieron **3 hallazgos de seguridad/correctitud** que conviene atender antes del próximo despliegue.

---

## 🔴 Críticos (seguridad / correctitud)

### C-1. `bcrypt` trunca el refresh token a 72 bytes → rotación/revocación inutilizada — [RIESGOSO]
`apps/api/src/infrastructure/shared/password.service.ts:12` (vía `auth.service.ts:69-76`)

El refresh token es un JWT (`header.payload.firma`), muy superior a 72 bytes. `bcrypt` **ignora todo byte más allá del 72**. Como el header es constante y el `sub` (cuid) es idéntico entre sesiones del mismo usuario, los primeros 72 bytes coinciden entre refresh tokens **distintos** del mismo usuario → `compararRefreshToken` da match contra el hash de **cualquier** refresh previo. La detección de reuso/robo por hash queda anulada (la verificación de firma sigue protegiendo, pero se pierde el segundo factor).

**Verificado manualmente.** Fix: pre-hashear con SHA-256 antes de bcrypt, en ambos lados:
```ts
const norm = crypto.createHash('sha256').update(token).digest('base64');
return bcrypt.hash(norm, ROUNDS);   // y lo mismo en compare
```
Riesgo: invalida los refresh tokens vigentes al desplegar (aceptable en un MVP no liberado). *Diff listo en la sección de propuestas.*

### C-2. IDOR: cualquier conductor puede leer el historial de cualquier viaje — [SEGURO] [APLICADO]
`apps/api/src/presentation/http/viajes/viajes.controller.ts:55-58`

`GET /viajes/:id/historial` solo tenía `JwtAuthGuard` de clase, sin `AdminGuard` ni chequeo de propiedad (a diferencia de `detalle`, que sí discrimina por rol). Un conductor autenticado podía enumerar por `id` el historial de viajes ajenos. **Verificado manualmente.** Corregido: el controller pasa el `CurrentUser` y, si es conductor, el use case exige que el viaje le pertenezca (reusa la misma validación de `detalle`).

### C-3. Tokens (incl. refresh de larga vida) en `localStorage` — superficie XSS — [RIESGOSO]
`apps/web/src/lib/token-store.ts:14-35`

Cualquier XSS (dependencia comprometida, render sin sanitizar) puede exfiltrar ambos tokens → toma total de sesión. Recomendación: migrar a cookies `httpOnly`+`Secure`+`SameSite=Strict` emitidas por la API (`withCredentials`). Si se mantiene `localStorage` como decisión consciente para el panel interno, documentarlo y acortar la vida del refresh. Cambia el contrato de auth → planificar.

---

## 🟠 Altos

### A-1. Duplicación estructural del expediente del conductor (las 4 capas) — [RIESGOSO]
El recurso "expediente" tiene 9–11 sub-recursos (aptitudes-unidad, ausencias, capacitaciones, certificaciones, control-confianza, evaluaciones, eventos-laborales, examenes-medicos, incidencias + documentos) **casi idénticos** replicados en:

| Capa | Archivos | Líneas aprox. | Duplicación |
|------|----------|---------------|-------------|
| Use cases | `application/conductores/expediente/*.usecase.ts` | ~1.100 | `asegurarConductor`/`listar`/`obtener`/`eliminar` idénticos salvo modelo/orderBy/mapeo |
| Controllers | `presentation/http/conductores/expediente/*.controller.ts` | ~585 | 9 × 65 líneas byte-por-byte iguales salvo tipos/DTOs/ruta |
| Tabs UI | `components/conductores/expediente/*-tab.tsx` | ~3.500 | query+delete+form+tabla+estados copiados 11 veces |

**Propuesta (abordar como proyecto, capa por capa, con tests de respaldo):**
- Backend: clase base `ExpedienteCrudUseCase<TModel, TCrear, TActualizar>` parametrizada por delegate Prisma + `orderBy` + mappers `toCreateData`/`toUpdateData`. Cada subclase queda en ~30–40 líneas. **Ahorro ~500–600 líneas.**
- Backend: factory de controller genérico (mixin tipado) `{ path, useCaseToken, CrearDto, ActualizarDto }`. **Ahorro ~430 líneas (~73%).**
- Frontend: hook `useRecursoExpediente({ recurso, conductorId })` + componente `<TablaExpediente loading error vacio>`. Cada tab → columnas + campos del form. **Ahorro 40–50% de ~3.500 líneas.**

### A-2. `listar-viajes-conductor` expone `trackingToken`, trae entidades completas y no pagina — [RIESGOSO]
`apps/api/src/application/conductores/listar-viajes-conductor.usecase.ts:18-23`

`findMany` con `include: { cliente: true, unidad: true }` devuelve el `Viaje` completo **incluido `trackingToken`** (el resto del sistema lo omite con `SELECCION_LISTADO`), trae columnas innecesarias de las relaciones y no pagina un historial ilimitado. Fix: reusar `SELECCION_LISTADO`/`RELACIONES_RESUMEN` + `paginar`. Cambia el shape de la respuesta → verificar consumidores (app Flutter).

### A-3. Race condition (TOCTOU) en la transición de estado de viaje — [RIESGOSO]
`apps/api/src/application/viajes/cambiar-estado-viaje.usecase.ts:36-90`

Se lee `estado` (`findUnique`) y se actualiza (`update`) en dos operaciones sin transacción ni guarda condicional. Dos peticiones concurrentes pueden aplicar dos transiciones + dos registros de historial. Fix: `update` condicional `where: { id, estado: estadoAnterior }` y tratar `P2025` como `ConflictException`.

### A-4. Diálogo de confirmación de borrado reimplementado inline 3 veces — ya existe `ConfirmDialog` — [SEGURO]
`flota/page.tsx:280-314`, `conductores/page.tsx:347-381`, `clientes/page.tsx:252-286` (~35 líneas c/u).
`components/confirm-dialog.tsx` ya existe y `catalogos/page.tsx` lo usa. Requiere darle a `ConfirmDialog` un modo controlado (`open`/`onOpenChange`) además del `trigger`. **Ahorro ~90 líneas + 3 piezas de estado.**

### A-5. Socket.io fija el token al crear la conexión — se rompe tras refresh — [SEGURO] [APLICADO]
`apps/web/src/lib/socket.ts:30-36`. El token se leía una vez; al reconectar tras expirar el access token, reenviaba el viejo y el gateway lo rechazaba (tracking se caía en silencio). Corregido con la forma callback `auth: (cb) => cb({ token: tokenStore.getAccess() ?? '' })`.

### A-6. `eslint.ignoreDuringBuilds: true` + ESLint no instalado en `apps/web` — [SEGURO]
`apps/web/next.config.mjs:5`, `apps/web/package.json`. El build ignora lint y no hay `eslint`/`eslint-config-next` ni `.eslintrc`. Se pierde la red que detectaría deps de `useEffect`, imports muertos y `any`. Fix: instalar ESLint + `next/core-web-vitals`, quitar `ignoreDuringBuilds`. *(No aplicado: requiere `npm install`.)*

---

## 🟡 Medios

### M-1. Lógica de "vencimiento/vigencia" duplicada en 5 sitios con umbrales inconsistentes — [RIESGOSO]
`expediente/tabla-ui.tsx:56-88` (≤30), `flota/types.ts:51-73` (≤30), `conductores/documento-utils.ts:26-49` (≤30), `alertas/tipos.ts:39-55` (≤3/≤7), `dashboard/etiquetas.ts` + `vencimientos-card.tsx` (≤7/≤15). **"Por vencer" significa cosas distintas según la pantalla** → incoherencia visible. Fix: un único `lib/vencimiento.ts` (`diasHasta`, `vencimientoInfo(iso, opts?)`) y **decidir la regla de negocio única** antes de migrar.

### M-2. Over-fetch en chequeos de mera existencia (repetido ~12 veces) — [SEGURO] [APLICADO parcial]
`asegurarConductor` en los 9 use cases de expediente + `documentos-conductor`, `eliminar-conductor`, `listar-viajes-conductor`, `crear-viaje`/`asignar-viaje` hacían `findUnique({ where: { id } })` sin `select`, trayendo todas las columnas (incl. `passwordHash`/`refreshTokenHash`). El patrón correcto ya existía en `documentos-unidad.usecase.ts:21-24`. Corregido en los puntos de mayor impacto (existencia de conductor). *Resto enumerado abajo.*

### M-3. `documentos-unidad.porVencer` trae la unidad completa — [SEGURO]
`flota/documentos-unidad.usecase.ts:116-121` usa `include: { unidad: true }`; el servicio de escaneo equivalente ya acota con `select: { placas: true }`. Acotar con `select`.

### M-4. Índices faltantes para `orderBy`/filtros frecuentes en `Viaje` — [SEGURO]
`prisma/schema.prisma`. El listado ordena por `createdAt desc` y filtra por `fechaProgramada`/`estado`, pero no hay índice sobre `createdAt` ni `fechaProgramada`. Añadir `@@index([estado, createdAt])` y `@@index([fechaProgramada])` (requiere migración).

### M-5. Tipos canónicos redefinidos localmente — [SEGURO] [APLICADO parcial]
`Paginado<T>` (ya en shared-types) redefinido en `clientes/tipos.ts:12` y `flota/types.ts:12`; `BadgeVariant` repetido 5 veces. Aplicado: ambos `Paginado` ahora se reexportan de `@flotaos/shared-types` (sin tocar consumidores). Pendiente (propuesto): centralizar `BadgeVariant` exportándolo desde `components/ui/badge.tsx` y reusarlo en los 5 sitios.

### M-6. `queryKeys` con formas inconsistentes entre listados — [RIESGOSO]
`clientes` usa `['clientes', {q,page,pageSize}]`, `conductores` `['conductores', {q,page}]`, `flota` `['unidades', q, page]` (posicional). Dificulta el invalidado selectivo. Unificar a objeto de filtros (idealmente un factory de keys), junto con el hook de listado (A-2 web).

### M-7. Dashboard/tracking quedan obsoletos hasta 20s tras mutaciones de viaje — [RIESGOSO]
Las mutaciones invalidan `['viajes']`/`['viaje',id]` pero no `['dashboard','viajes']` ni `['tracking','viajes-activos']`. Con un prefijo común de key, un solo `invalidateQueries({ queryKey: ['viajes'] })` los cubriría.

### M-8. `as any` para enums en el límite con Prisma — [RIESGOSO]
`certificaciones.usecase.ts:50,93`, `aptitudes-unidad.usecase.ts:46,47,95,96`. Los DTOs validan `tipo`/`nivel` solo con `@IsString()` y luego se castea `as any` a enum. Fix: `@IsEnum(<EnumPrisma>)` en el DTO + tipar la interface con el enum, eliminando el cast.

### M-9. CORS HTTP demasiado permisivo e incoherente con el WS — [SEGURO] [APLICADO]
`main.ts:16` usaba `origin: true`. El gateway WS ya lee `CORS_ORIGIN`. Corregido: HTTP reusa el mismo origen de `CORS_ORIGIN` (lista blanca en prod; `*`/reflejo solo si no está definida).

### M-10. `documentos-dialog` de conductor y de unidad casi idénticos — [RIESGOSO]
`conductores/documentos-dialog.tsx` (323) y `flota/documentos-dialog.tsx` (330) son el mismo componente salvo grupo de catálogo, ruta y un campo. Extraer `<DocumentosDialogBase>`. **Ahorro ~300 líneas.**

### M-11. Form-dialogs de entidad duplican estado/submit/dialog — [RIESGOSO]
`cliente-form-dialog`, `conductor-form-dialog`, `unidad-form-dialog`, `editar-viaje-dialog` repiten `useForm`+`reset`+`useMutation`(patch/post)+`toast`+footer. Extraer `useEntityFormDialog({ schema, queryKey, endpoint, toDefaults, toPayload, mensajes })`.

### M-12. `<div key>` envolviendo capas de react-leaflet — [SEGURO] [APLICADO]
`components/tracking/mapa.tsx:84-142`. react-leaflet no renderiza DOM en el árbol React para esas capas → `<div>` genera nodos sueltos. Corregido usando `<Fragment key=…>`.

---

## 🟢 Bajos (selección; lista completa en los informes por agente)

- **B-1.** Mappers de `AlertaVencimiento` y su `sort` duplicados 4× en `escaneo-vencimientos.service.ts` → extraer `aAlertaUnidad`/`aAlertaConductor`. **[SEGURO]**
- **B-2.** Inconsistencia `?? null` vs `?? undefined` en `crear` del expediente (`examenes-medicos:54`, `control-confianza:54`). Unificar a `?? null`. **[SEGURO]**
- **B-3.** Default de negocio embebido como literal `gravedad ?? 'MEDIA'` (`incidencias.usecase.ts:58`) → constante/`@default` de Prisma. **[SEGURO]**
- **B-4.** Footer de paginación duplicado 4× → `<Paginacion>`. Lógica de "retroceder página al borrar el último" solo en clientes. **[SEGURO]**
- **B-5.** Mapas de etiquetas de tipo-documento duplicados 4× con cobertura distinta → preferir `<CatalogoTexto>`/`useCatalogo`. **[RIESGOSO]**
- **B-6.** Helpers de fecha duplicados (`isoADate`/`toDateInput`, `toLocaleDateString` 3×); conviven `toLocaleDateString` y `date-fns`. Unificar en `lib/fechas.ts` + una sola librería. **[SEGURO]**
- **B-7.** Tipo de "alerta de vencimiento" con dos nombres (`AlertaVencimiento` vs `VencimientoAlerta`) y `folio` como `string` en un módulo y `number` en otro → consolidar en shared-types. **[SEGURO]**
- **B-8.** `as any` en `zodResolver` (`datos-tab.tsx:163`) → tipar `useForm<z.infer<...>>`. **[SEGURO]**
- **B-9.** Falta `helmet()` y filtro global de excepciones en `main.ts`. **[SEGURO]**
- **B-10.** Controllers devuelven entidades Prisma crudas (acopla HTTP↔BD). Mapear a tipos de respuesta como ya se hace con `ConductorPublico`. **[SEGURO]**
- **B-11.** Ruta pública `/seguimiento/[token]` referenciada por `tracking-link.tsx` pero **inexistente** → enlace 404 (pendiente de Fase 1). **[SEGURO]**
- **B-12.** Strings de eventos socket fuera de `WS_EVENTS` (`'suscribir'` literal). Centralizar. **[SEGURO]**
- **B-13.** `tsconfig` web sin `noUnusedLocals`/`noUnusedParameters`; `allowJs:true` innecesario. **[SEGURO]**
- **B-14.** Seed de catálogos con upserts secuenciales (~150 round-trips) → `Promise.all`/`createMany`. **[SEGURO]**
- **B-15.** Throttle de login con config repetida (`auth.controller.ts:40,47`) → constante. Imports relativos largos → path alias `@app/*`. **[SEGURO]**
- **B-16.** `ClienteFormDialog` usa `<span onClick>` como trigger (no accesible) → `DialogTrigger asChild`. **[SEGURO]**

---

## Aspectos correctos (sin acción)
- `paginar`/`fecha.util`/`token.util` bien reutilizados; sin paginación ni aritmética de fechas reimplementada a mano.
- Sin fugas de credenciales: `aConductorPublico`/`aUsuarioPublico` excluyen hashes; mensajes de login genéricos.
- Sin N+1 reales; `escaneo-vencimientos` usa `Promise.all`+`select`; ingesta de ubicaciones atómica.
- Tolerancia a Redis/SMTP caídos; reintentos con backoff; jobs idempotentes.
- WS autenticado en el handshake con validación de pertenencia del viaje.
- TanStack Query con defaults sensatos; SSR-safe; cleanup de sockets/listeners correcto.
- `components/ui/` (shadcn): los 12 componentes están en uso, sin bloat ni huérfanos.

---

## Plan sugerido por fases

1. **Seguridad (rápido):** C-1 (bcrypt), C-2 ✅, A-5 ✅, M-9 ✅, B-9. Luego C-3 (cookies httpOnly) como proyecto aparte.
2. **Quick wins seguros:** M-2 (select id) ✅parcial, M-3, M-5 ✅, B-1, B-2, B-3, B-6, M-12 ✅, A-6 (ESLint).
3. **Reducción de duplicación (mayor palanca):** A-1 (expediente en las 4 capas), A-4, M-10, M-11 — capa por capa con tests.
4. **Optimización BD:** M-4 (índices), A-2, A-3.
5. **Coherencia de estado web:** M-6, M-7 (factory de queryKeys) junto con los hooks de listado.

---

*Generado con auditoría asistida por Claude Code.*
