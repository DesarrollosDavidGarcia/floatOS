# FlotaOS — Auditoría de Infraestructura, API, Web y Flutter

**Fecha:** 2026-07-03
**Alcance:** Infraestructura (Docker/Nginx/Traefik/scripts/CI-CD/backups), API (NestJS), Panel Web (Next.js) y App Conductor (Flutter).
**Dimensiones evaluadas:** Seguridad y secretos · CI/CD y despliegue · Fiabilidad y datos · Calidad de código y build.
**Método:** diagnóstico de solo lectura (no se modificó código). Cuatro auditorías especializadas en paralelo + verificación directa de git/gitignore.

---

## 1. Resumen ejecutivo

La **postura de seguridad de aplicación es notablemente sólida** para el tamaño del proyecto: JWT en cookie `httpOnly` + refresh rotatorio con hash, login timing-safe anti-enumeración, `ValidationPipe` global estricto, SQL crudo parametrizado, RBAC con guards en todos los controladores, cifrado AES-256-GCM de secretos PAC/CSD, tokens en `flutter_secure_storage`, y **ningún secreto real versionado en git** (`.gitignore` completo y correcto).

Los problemas se concentran en la **capa operativa/infraestructura**: no hay pipeline CI/CD, TLS está deshabilitado en el Nginx por instancia, la lista de variables inyectadas al contenedor de la API está incompleta (CORS y `SECRETS_KEY` entre ellas), los contenedores corren como root, y los backups no tienen offsite obligatorio ni prueba de restauración. En Flutter hay un bloqueante de publicación (release firmado con la keystore de debug). En la API, un TOCTOU de asignación puede provocar doble reserva de conductor/caja.

### Conteo de hallazgos

| Severidad | Infra | API | Web | Flutter | **Total** |
|-----------|:----:|:---:|:---:|:-------:|:---------:|
| **P0** — crítico/bloqueante | 0 | 0 | 0 | 1 | **1** |
| **P1** — alto | 5 | 1* | 2 | 1 | **9** |
| **P2** — medio | 9 | 6 | 7 | 6 | **28** |
| **P3** — menor/mejora | 8 | 5 | 8 | 4 | **25** |

\* El TOCTOU de asignación fue reportado como P2 por el auditor de API; se **eleva a P1** en esta síntesis por ser corrupción de datos de negocio.

> Varios hallazgos son **transversales** (aparecen en 2+ frentes): contenedores root (API+Web+Infra), CORS abierto (API+Infra), `npm install` no reproducible (API+Web), Swagger en prod (API+Infra), key de Google Maps sin restricción efectiva (Web+Flutter). Se consolidan en §3.

---

## 2. Cuadro de mando — lo urgente primero

### 🔴 P0 — Bloqueante

| # | Hallazgo | Frente | Ubicación |
|---|----------|--------|-----------|
| 1 | **Release firmado con keystore de debug** — no publicable en Play Store, suplantable, y si se sube "quema" el applicationId | Flutter | `android/app/build.gradle.kts:47-53` |

### 🟠 P1 — Alto (atender antes de crecer clientes)

| # | Hallazgo | Frente | Ubicación |
|---|----------|--------|-----------|
| 2 | **CORS abierto en producción**: `CORS_ORIGIN` nunca se inyecta al contenedor → `origin: true` + `credentials: true` refleja cualquier origen | Infra + API | `docker-compose.yml:18-40`, `main.ts:30-35`, `tracking.gateway.ts:66` |
| 3 | **`SECRETS_KEY` y varias keys no llegan al contenedor** (lista `environment` incompleta, sin `env_file`) → cifrado en reposo se deriva de `JWT_SECRET`; IA/bot/push/ruteo silenciosamente deshabilitados | Infra | `docker-compose.yml:18-40` vs `.env.example` |
| 4 | **TLS deshabilitado en Nginx standalone** — HTTP plano (login/JWT/GPS/POD en claro) fuera de Traefik | Infra | `nginx/nginx.conf:26-38` |
| 5 | **Sin CI/CD** (`.github/` ausente) — build/publish manual desde la máquina del dev, sin gate de tests/lint ni escaneo de vulnerabilidades | Infra | (ausencia) |
| 6 | **Backups sin offsite obligatorio ni restore probado** — VPS y backups mueren juntos; `pg_dump` corrupto pero no vacío pasa validación | Infra | `scripts/backup-cliente.sh:47-51` |
| 7 | **Sin cabeceras de seguridad en la app Next** (CSP, X-Frame-Options, HSTS…) — clickjacking, sin defensa en profundidad ante XSS | Web | `next.config.mjs:1-10` |
| 8 | **Contenedores corren como root** (API + Web) — RCE/escape escala a root en el contenedor | API + Web | ambos `Dockerfile` |
| 9 | **TOCTOU doble-reserva en asignación de viaje** — checks fuera de la transacción → dos requests asignan el mismo conductor/caja | API | `asignar-viaje.usecase.ts:112,131,150` |
| 10 | **Cola offline de GPS solo en memoria** — se pierde el rastro si el SO mata el proceso en zona sin señal | Flutter | `tracking_controller.dart:57`, `tracking_repository.dart:6-8` |

---

## 3. Temas transversales (consolidados)

Estos hallazgos afectan a más de un frente; conviene resolverlos de una vez con una política común.

- **Contenedores como root** (API, Web): añadir `USER node` (ya existe en `node:*-alpine`) tras copiar artefactos; en compose `security_opt: [no-new-privileges:true]`, `cap_drop: [ALL]`.
- **CORS abierto por env faltante** (API, Infra): inyectar `CORS_ORIGIN` al contenedor **y** hacerlo obligatorio cuando `NODE_ENV=production` (hoy `@IsOptional` en `env.validation.ts:73-75`, con fallback a `true`).
- **`npm install` en vez de `npm ci`** (API `Dockerfile:14,35`, Web `Dockerfile:8,29`): builds no reproducibles pese a copiar el lockfile.
- **Swagger sin gate de entorno** (API `main.ts:44-59`): expone el esquema completo en prod; envolver en `if (NODE_ENV !== 'production')`.
- **Google Maps key sin restricción efectiva** (Web + Flutter): la misma key en Android e iOS no puede restringirse por app en ambas a la vez; la key `NEXT_PUBLIC_*` viaja en el bundle y en URLs de Static Maps. Emitir **4 keys separadas y restringidas** (ya documentado en la memoria del proyecto) y rotar la actual.
- **`.dockerignore` inefectivos** (Infra): el contexto de build es la raíz (`context: .`), así que Docker solo honra `./.dockerignore` — que **no existe**. Los de `apps/api` y `apps/web` no surten efecto → todo el repo (incl. `.env`, `clientes/`, `backups/`, `.git`) se envía al daemon.

---

## 4. Infraestructura (Docker · Nginx · Traefik · Scripts · CI/CD · Backups)

> Modelo confirmado: **instancia-por-cliente** (no multi-tenancy en app), imágenes en GHCR, `pull` por instancia, Traefik opcional como borde TLS multi-cliente.

### 4.1 Seguridad y secretos
- **[P1]** CORS abierto por `CORS_ORIGIN` no inyectado → *ver §3 y #2*.
- **[P1]** Secretos/`SECRETS_KEY` no propagados al contenedor (falta `env_file`) → *ver #3*.
- **[P1]** TLS deshabilitado en Nginx standalone (443 y redirección comentados; `certs/` vacío) → *ver #4*. Añadir también HSTS.
- **[P2]** Contenedores como root, sin `cap_drop`/`no-new-privileges`/`read_only` → *ver §3*.
- **[P2]** `.dockerignore` fuera del contexto de build → *ver §3*. Crear `./.dockerignore` raíz que excluya `**/.env*`, `clientes/`, `backups/`, `.git`, `node_modules`, `apps/mobile`.
- **[P2]** Swagger UI expuesto incondicionalmente → *ver §3*.
- **[P2]** Sin rate limiting ni cabeceras de seguridad a nivel proxy (Nginx sin `limit_req`/`add_header`; Traefik sin middlewares `headers`/`ratelimit`). El throttling depende solo del API (120/min global).
- **[P3]** Redis sin contraseña (`--requirepass`); en el override de dev se publica `6379:6379` en `0.0.0.0`.
- **[P3]** `alta-cliente.sh` escribe `.env` sin `chmod 600` e imprime `ADMIN_PASSWORD` a stdout (`:96`).

### 4.2 CI/CD y despliegue
- **[P1]** Sin pipeline CI/CD → *ver #5*. Proponer GitHub Actions: en tag → tests (jest/vitest ya existen) + build + escaneo (Trivy/grype) + push a GHCR; separar `latest` de release inmutable.
- **[P2]** Tags mutables `latest` (`minio/minio:latest`, `n8nio/n8n:latest`, fallback `${FLOTAOS_VERSION:-latest}`) → fijar versiones/digests.
- **[P2]** Sin rollback automatizado; migraciones en boot (`prisma migrate deploy`) sin plan de reversión → adoptar política expand/contract y healthcheck post-deploy con rollback de imagen.
- **[P3]** Traefik enruta por labels sin readiness → añadir healthchecks (§4.3) para no publicar backends no sanos; cuidar rate-limit de Let's Encrypt al recrear `acme.json`.

### 4.3 Fiabilidad y datos
- **[P1]** Backups locales sin offsite obligatorio ni restore probado → *ver #6*. Offsite cifrado (rclone/B2/S3) + job periódico de restauración a BD desechable + smoke query.
- **[P2]** Healthchecks solo en Postgres; `depends_on` no espera readiness → añadir a api (`/api/health`), web, redis (`redis-cli ping`), minio (`/minio/health/live`) y usar `condition: service_healthy`.
- **[P2]** Sin límites de recursos (CPU/mem) en ningún servicio → riesgo de "vecino ruidoso" en VPS compartido. Definir `mem_limit`/`cpus` por servicio.
- **[P2]** Observabilidad casi nula: sin logging centralizado, sin rotación (`max-size`/`max-file`), sin métricas ni alertas de fallo de backup.
- **[P3]** Persistencia por named volumes correcta, pero RPO limitado a la cadencia diaria del cron; considerar WAL archiving/PITR si el negocio lo exige.

### 4.4 Calidad de build y estructura
- **[P3]** Todos los servicios en la bridge `default`; sin segmentación → separar redes `frontend`/`backend` para que `web` no alcance directo a los datastores.
- **[P3]** Override de dev publica `5432/6379/9000/9001` en `0.0.0.0` → bind a `127.0.0.1:`.
- **[P3]** Sin Docker secrets ni gestor externo; todo en `.env` plano (visible en `docker inspect`).
- **[P3]** n8n con `N8N_SECURE_COOKIE=false` + `http` + puerto publicado → mantener estrictamente en localhost; si se publica, TLS + cookie segura + auth.

---

## 5. API (NestJS)

> **Sin P0 explotables.** Postura de seguridad sólida (ver aciertos al final). Hallazgos = hardening + fiabilidad.

### 5.1 Seguridad y secretos
- **[P2]** Swagger sin gate de entorno (`main.ts:44-59`) → *ver §3*.
- **[P2]** CORS refleja origen con credenciales si falta env (`main.ts:30-35`, `tracking.gateway.ts:66-75`) → *ver §3/#2*; hacer `CORS_ORIGIN` requerida en prod.
- **[P2]** `SECRETS_KEY` opcional derivada de `JWT_SECRET` (`secret-crypto.service.ts:28-42`): rotar `JWT_SECRET` dejaría **indescifrables** pacToken/pacPassword/csdPassword → exigir `SECRETS_KEY` en prod.
- **[P3]** `FileInterceptor` sin `limits` en IA y logo (`ai.controller.ts:48,67`, `empresa.controller.ts:44`) con `memoryStorage` → bufferiza el archivo completo en RAM antes de rechazar. Añadir `limits.fileSize` como en chat/flota.
- **[P3]** `.dockerignore` no excluye `secrets/` → la credencial Firebase llega a la capa del build stage (el runtime no la copia; riesgo bajo).

### 5.2 CI/CD y build
- **[P2]** Contenedor corre como root → *ver §3*.
- **[P2]** `npm install` en vez de `npm ci` (`Dockerfile:14,35`) → *ver §3*.
- **[P3]** Sin `HEALTHCHECK` en el Dockerfile pese a tener `/api/health`.
- **[P3]** `migrate deploy` en cada arranque → posible carrera si se escala a múltiples réplicas (bajo en single-instance).

### 5.3 Fiabilidad
- **[P2]** Sin graceful shutdown: no se llama `app.enableShutdownHooks()` (`main.ts`) → los `OnModuleDestroy` de Prisma/colas BullMQ no corren en `SIGTERM`; jobs en vuelo abortados.
- **[P1]** TOCTOU doble-reserva en asignación (`asignar-viaje.usecase.ts:112,131,150`) → *ver #9*. Mover checks dentro de la transacción con `SELECT … FOR UPDATE` o índice único parcial + reintento.
- **[P3]** `BrevoMailProvider.enviar` hace `fetch` sin timeout (`brevo.provider.ts:42-50`) → bloquea el worker de cotizaciones (`concurrency:3`). Añadir `AbortController` + timeout como en ruteo.

### 5.4 Calidad y tests
- **[P3]** ESLint en `warn`, `lint` con `--fix` (no `--max-warnings 0`) → la deuda no bloquea CI.
- **[P3]** Sin umbral de cobertura ni e2e (~17 `.spec.ts` unitarios; e2e pendiente) → añadir `coverageThreshold` + e2e de login/asignación/cotización.

**Aciertos API:** JWT httpOnly+bearer móvil · refresh rotatorio con hash · login timing-safe anti-enumeración · `ApiKeyGuard` con `timingSafeEqual` · `ValidationPipe` `whitelist+forbidNonWhitelisted+transform` · validación de archivos por magic bytes · SQL crudo parametrizado · `AllExceptionsFilter` oculta internals · RBAC con guard en todos los controladores · tolerancia a Redis caído con fallback · reintentos con backoff en colas · `tsconfig strict` · **cero** `TODO/as any/@ts-ignore` en `src`.

---

## 6. Panel Web (Next.js)

> Base de sesión muy sólida (cookies `httpOnly`, sin tokens en localStorage, refresh transparente, sin `dangerouslySetInnerHTML`). Carencias en cabeceras, hardening Docker y tests.

### 6.1 Seguridad y secretos
- **[P1]** Ausencia total de cabeceras de seguridad (`next.config.mjs:1-10`, sin `middleware.ts`) → *ver #7*. Añadir `headers()` con `X-Frame-Options: DENY`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS y CSP.
- **[P2]** Sin protección CSRF explícita con auth por cookie (`lib/api.ts:14-18`, `withCredentials:true`) → verificar `SameSite=Strict` en refresh (backend); considerar cabecera anti-CSRF en mutaciones.
- **[P2]** Notificaciones en `localStorage` con clave global sin scoping ni limpieza en logout (`notificaciones.tsx:23,148`, `auth.tsx:59-67`) → en dispositivo compartido, el usuario B ve folios/direcciones del usuario A. Limpiar en logout o incluir `userId` en la clave.
- **[P2]** Key de Google Maps en cliente y en URL de Static Maps (`providers.tsx:18`, `geocoding.ts`, `mapa-estatico.tsx:80`) → *ver §3*.
- **[P3]** Protección de rutas solo en cliente (`(panel)/layout.tsx:15-33`) → riesgo bajo (API protege datos); opcional `middleware.ts` por presencia de cookie.
- **[P3]** Email de admin precargado en login (`login/page.tsx:17`) → dejar vacío en prod.

### 6.2 CI/CD y build
- **[P1]** Contenedor corre como root (`Dockerfile:22-38`) → *ver §3*.
- **[P2]** No usa `output: 'standalone'` de Next → imagen inflada (reinstala deps y copia `.next` completo). Activar standalone y copiar `.next/standalone`+`static`+`public`.
- **[P2]** `npm install` en vez de `npm ci` (`Dockerfile:8,29`) → *ver §3*.
- **[P3]** `X-Powered-By: Next.js` no deshabilitado → `poweredByHeader:false`.
- **[P3]** `node:22-alpine` sin digest e incoherente con Node 20 del resto del monorepo → fijar por digest y alinear versión.

### 6.3 Fiabilidad — **bien resuelta**
- Error boundaries (`(panel)/error.tsx`, `global-error.tsx`), reconexión WS robusta con re-suscripción y refcount, refresh deduplicado con redirect, PWA offline (`sw.js`) que no cachea `/api` ni `/socket.io`.
- **[P3]** Socket sin handler `connect_error` (`lib/socket.ts`) → reintentos en bucle si expira la cookie hasta que el interceptor HTTP redirige.
- **[P3]** Sin `loading.tsx` a nivel de ruta (se usan skeletons por componente).

### 6.4 Calidad y tests
- **[P2]** Cobertura muy baja: 3 tests para ~130 archivos; `vitest.config.ts:15` fija `environment:'node'` → **imposible** probar componentes React (falta jsdom). Añadir jsdom + testing-library y cubrir guard de roles, auth/refresh y validaciones de formularios.
- **[P2]** Next.js `14.2.21` desactualizado (por debajo de 14.2.25; acumula parches; CVE-2025-29927 de middleware no aplica al no haber middleware) → actualizar la línea 14.2.x.
- **[P3]** `strict:true` correcto pero páginas cliente monolíticas (viajes/[id] 646 líneas, documentos-dialog-base 496, usuarios 426, configuración 399) → extraer subcomponentes/hooks.
- **[P3]** ESLint no bloquea build ante warnings → en CI, `next lint --max-warnings=0`.

---

## 7. App Conductor (Flutter)

### 7.1 Seguridad y secretos
- **[P0]** Release firmado con keystore de debug (`build.gradle.kts:47-53`) → *ver #1*. Crear keystore de release fuera de git vía `key.properties` (gitignored) + Play App Signing.
- **[P2]** Misma Maps key en Android e iOS (`local.properties:7`, `Secrets.xcconfig:3`) sin restricción efectiva → *ver §3*.
- **[P2]** Sin ofuscación ni minify/R8 en release (nombres de clases/endpoints en claro) → `flutter build appbundle --obfuscate --split-debug-info=…` + R8 con ProGuard.
- **[P3]** Sin certificate pinning para el API (`api_client.dart:10-15`) → evaluar SPKI pinning en prod.

**Positivos:** JWT en `flutter_secure_storage` · no persiste CURP/RFC/NSS · `local.properties`/`Secrets.xcconfig`/`google-services.json` **gitignored** · cleartext HTTP solo en `debug/AndroidManifest.xml` · permisos justificados; usa foreground service (no `ACCESS_BACKGROUND_LOCATION`).

### 7.2 CI/CD y build
- **[P2]** Sin flavors dev/prod; URL base dev cableada como default cleartext (`app_config.dart:10-19`, `http://10.0.2.2:3000/api`) → flavors con applicationId por entorno + `--dart-define-from-file`; fallar build en prod si falta `API_URL`.
- **[P2]** `minSdk/targetSdk/versionCode` heredan defaults de Flutter (`build.gradle.kts:38-41`) → fijar explícitamente (`minSdk 24+`, `targetSdk 34/35`) por el foreground service de tracking y `POST_NOTIFICATIONS`.

### 7.3 Fiabilidad
- **[P1]** Cola GPS solo en memoria (`tracking_controller.dart:57`) → *ver #10*. Persistir en drift/SQLite/Hive (ya previsto en Fase 2, elevar prioridad).
- **[P2]** Token FCM siempre registrado como `'android'` hardcodeado (`push_messaging_service.dart:24-27`) → push a iOS mal enrutado. Derivar de `Platform.isIOS`.
- **[P3]** Handler FCM de background vacío (`main.dart:15-16`) → mensajes data-only se pierden con app cerrada; garantizar contrato `notification` o mostrar notificación local.

**Positivos (fiabilidad, bien resueltos):** refresh con Dio "plano" anti-deadlock · reconexión WS con re-inyección de token vigente + re-suscripción · backoff del stream GPS al apagar GPS · manejo de permisos revocados · envío en lote (máx 500) · cierre de servicios en logout.

### 7.4 Calidad y tests
- **[P2]** Cobertura baja: solo tests de modelos de dominio; sin tests de `ApiClient`/`TrackingController`/`SocketService` (la lógica con más historial de bugs).
- **[P3]** Lint mínimo (`flutter_lints` por defecto) → activar `strict-casts`, `avoid_dynamic_calls`.
- **[P3]** Dependencias al día (riverpod 3.3.2, dio 5.9.2, firebase_messaging 16.4.1…); correr `flutter pub outdated` periódicamente.

---

## 8. Plan de remediación sugerido

### Sprint 1 — Bloqueantes y exposición (P0/P1 de seguridad)
1. **Flutter:** keystore de release + Play App Signing (P0).
2. **Infra/API:** inyectar `CORS_ORIGIN` y `SECRETS_KEY` (y demás keys) al contenedor vía `env_file`; hacer `CORS_ORIGIN` obligatoria en prod.
3. **Infra:** habilitar TLS+HSTS en Nginx (o documentar que standalone solo va detrás de terminador TLS).
4. **Web:** `headers()` con CSP/X-Frame-Options/HSTS + `poweredByHeader:false`.
5. **API+Web:** `USER node` en ambos Dockerfiles + `no-new-privileges`/`cap_drop` en compose.

### Sprint 2 — Datos y fiabilidad
6. **API:** cerrar el TOCTOU de asignación (transacción + lock) y `enableShutdownHooks()`.
7. **Infra:** backups offsite cifrados obligatorios + job de restore de prueba; healthchecks en todos los servicios + `condition: service_healthy`; límites de recursos.
8. **Flutter:** persistir la cola GPS (drift/SQLite).

### Sprint 3 — Automatización y calidad
9. **Infra:** GitHub Actions (test → build → escaneo Trivy → push GHCR); fijar tags/digests; `.dockerignore` raíz; `npm ci` en ambos Dockerfiles.
10. **Web/API/Flutter:** subir cobertura de tests (jsdom en web; controller/refresh en móvil; e2e en API); ESLint `--max-warnings 0` en CI; actualizar Next 14.2.x.
11. **Infra:** rate-limit/headers en proxy, segmentación de redes, rotación de logs, observabilidad básica.

---

## 9. Fortalezas confirmadas (no tocar)

- **Gestión de secretos en git:** ningún secreto real versionado; `.gitignore` completo (`.env*`, `secrets/`, keystores Firebase, `acme.json`, `backups/`, certs).
- **Autenticación:** cookies `httpOnly` + refresh rotatorio con hash, login timing-safe, `ApiKeyGuard` con `timingSafeEqual`, RBAC con guard en todos los controladores.
- **Backend:** DDD limpio, `ValidationPipe` estricto, SQL parametrizado, cifrado AES-256-GCM, `tsconfig strict`, cero deuda de tipos en `src`, colas con reintentos y tolerancia a Redis caído.
- **Web:** modelo de sesión seguro, error boundaries, reconexión WS robusta, PWA offline correcta.
- **Flutter:** tokens en secure storage, reconexión WS con re-auth, backoff de GPS, minimización de datos de perfil.

---

*Informe generado por auditoría multiagente (4 auditores especializados) el 2026-07-03. Diagnóstico de solo lectura; no se modificó código.*
