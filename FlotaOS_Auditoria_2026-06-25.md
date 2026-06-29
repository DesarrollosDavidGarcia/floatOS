# Auditoría FlotaOS — API + Web (2026-06-25)

**Alcance:** `apps/api` (NestJS 10, Clean Architecture, Prisma 6, BullMQ) y `apps/web`
(Next.js 14, React Query). Foco en el código nuevo del PR #6 (IA de documentos/CSF,
bot de cotización n8n, cotizaciones async) + revisión transversal de seguridad,
performance/escalabilidad, QA y manejo de datos.
**Método:** 4 auditorías paralelas (seguridad, performance/escalabilidad, calidad/QA,
frontend) + verificación manual de los hallazgos críticos.

## Veredicto

Código nuevo **bien construido**: RBAC en todos los controllers nuevos, magic-bytes
en adjuntos, `strict:true`, ~0 `any`, refactor del expediente ya saldado. **Sin
vulnerabilidad crítica.** Los hallazgos fueron de endurecimiento y robustez bajo
carga/fallo. Todo lo seleccionado quedó aplicado y verificado (API jest 122/122, web
vitest 39/39, tsc y lint verdes).

---

## ✅ Aplicado en esta sesión

### Robustez API
- **Timeout en geocoding** (`geocoding.service.ts`): `AbortController` 8 s (antes el
  `fetch` a Google podía colgar el request del bot indefinidamente).
- **Cliente OpenAI con `timeout: 60s` + `maxRetries: 1`** (`ai.service.ts`): antes
  heredaba el default del SDK (~10 min) y podía retener el request.
- **Fast-fail del productor Redis** (`redis.connection.ts` + `cotizaciones.queue.ts`):
  nuevo modo `'productor'` con `enableOfflineQueue:false` + `maxRetriesPerRequest:1`,
  para que `queue.add()` falle al instante con Redis caído y dispare el fallback
  síncrono (el worker conserva `null`).

### Seguridad
- **API key del bot en tiempo constante** (`api-key.guard.ts`): `crypto.timingSafeEqual`
  sobre digests SHA-256 (evita timing attack y fuga de longitud).
- **`@Throttle` propio del bot** (`bot.controller.ts`): 20/min (antes solo el global
  120/min) — acota fuerza bruta de la key y abuso de geocoding/ruteo facturables.
- **Tope diario de geocoding** (`geocoding.service.ts`): contador best-effort con
  `GOOGLE_MAPS_GEOCODE_MAX_DIARIO` (default 2000) → 503 al superarse.

### Performance / BD — migración `20260625120000_indices_busqueda_y_limpieza`
- Índices **GIN trigram** para `clientes.rfc` y `conductores.nombre/apellidos/usuario/email`
  (los listados hacían `ILIKE '%x%'` con seq-scan).
- Índice **btree** `escalas_viaje.llegadaNotificadaEn` (campana del panel hacía
  scan+sort de toda la tabla).
- **Drop** del índice redundante `ubicaciones_conductor_viajeId_idx` (cubierto por el
  compuesto `[viajeId, capturadoEn]`) → escrituras GPS más baratas.

### Calidad / reducción
- **`BotCotizacionService`**: la lógica de negocio salió del `BotController`
  (testeable, presentación delgada) + **saneo del JSON de tarifas** de empresa (filtra
  a claves conocidas y tipos válidos antes de mergear al motor).
- **Dedup**: `r2` y `TARIFAS_DEFECTO` ahora viven (y se exportan) en
  `domain/cotizacion/motor-cotizacion.ts` como fuente única.

### Tests nuevos (+23, API ahora 122/122)
- `ai.service.spec.ts`: normalizadores fiscales (RFC, CP, fecha en 3 formatos +
  validación de calendario y TZ, régimen SAT genéricos vs específicos, salvavidas por
  regex, integración `mapearCliente`).
- `api-key.guard.spec.ts`: fail-closed sin key (503), header ausente/incorrecto (401),
  prefijo-correcto-distinto, key válida.

### Web
- **PDF de cotización**: `window.open` síncrono dentro del click (evita bloqueo de
  popup) con cierre en error.
- **Envío de cotización**: botón "Enviar" deshabilitado sin destinatarios + commit del
  borrador del chip en `blur` (ya no se pierde un correo tecleado sin "Agregar").
- **Preview de cotización**: estado de error con "Reintentar" (antes quedaba
  "Calculando…" para siempre si fallaba).
- **`invalidarCotizaciones` / `cotizacionesKey`** en `lib/query-keys.ts`: elimina la
  invalidación duplicada en 4 componentes y la key literal repetida en 5 sitios.
- `aria-label` en el botón cerrar del formulario de documentos.

---

## ⏳ Backlog (no incluido — requiere decisión o más esfuerzo)

| Sev | Hallazgo | Archivo | Nota |
|-----|----------|---------|------|
| 🟠 | Rasterización PDF + extracción IA en el request (bloquea event loop) | `ai.service.ts` | Mover a worker BullMQ (como cotizaciones) o `worker_thread`. Admin-only. |
| 🟠 | Race TOCTOU en asignación de conductor/caja | `asignar-viaje.usecase.ts` | Verificación fuera de la transacción; mover dentro (serializable) o constraint parcial. |
| 🟠 | Sin tests de orquestación de `cotizaciones.service` ni e2e | — | Transiciones de estado, dedup cc/bcc; e2e mínimo de autorización. |
| 🟢 | Posibles objetos huérfanos en MinIO si falla el `create` | `chat.usecase.ts`, `archivos-documento-conductor.usecase.ts` | Limpieza best-effort o subir tras confirmar. |
| 🟢 | PII de CSF (RFC/domicilio) volcada a logs ante fallo de parseo | `ai.service.ts:330` | Truncar/loguear solo estado. Documentar envío a Novita en aviso de privacidad. |
| 🟢 | Socket.io sin adaptador Redis | `tracking.gateway.ts` | Límite conocido; solo importa si se corre >1 réplica por flota. |
| 🟢 | Lectura duplicada de empresa en `procesarEnvio`/`generarPdf` | `cotizaciones.service.ts` | Pasar la config ya cargada. |
| 🟢 | `aria-label` en triggers de menú icon-only del expediente | varios `*-tab.tsx` | Homogeneizar. |
