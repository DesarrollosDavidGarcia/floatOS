---
name: verify
description: Levantar FlotaOS en local y ejercitar la API/web de verdad (HTTP contra :3000) para comprobar un cambio en tiempo de ejecución. Úsalo cuando haya que observar el comportamiento real, no correr tests.
---

# Verificar FlotaOS en runtime

Receta comprobada el 2026-08-19 (Windows 11, Git Bash + PowerShell).

## 1. Servicios de datos

```bash
docker compose up -d postgres redis minio   # el override sólo levanta datos; api/web van en el host
```

Si `docker info` falla, arranca Docker Desktop y espera:

```bash
powershell -c "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"
until docker info >/dev/null 2>&1; do sleep 3; done
```

## 2. API

**Node 20 obligatorio** y con la ruta explícita — el symlink de nvm puede revertir a v16 a media
sesión y el child que re-spawnea `nest start --watch` se queda sin `fetch` global:

```bash
export PATH="/c/Users/PC/AppData/Local/nvm/v20.20.2:$PATH"
npm run dev:api > "$TEMP/flotaos-api.log" 2>&1 &
until grep -q "successfully started" "$TEMP/flotaos-api.log"; do sleep 2; done
```

Escucha en `http://localhost:3000/api`. El watcher **recompila solo** al tocar ficheros: para
comparar contra el código sin el cambio basta `git stash` / `git stash pop` y esperar a que el
contador de `grep -c "successfully started"` suba (no hace falta reiniciar nada).

Al terminar, mátala por PID o el `dist/main` sobrevive y bloquea `prisma generate` con EPERM:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  ? { $_.CommandLine -match 'dev:api|@flotaos/api|nest start|apps\\api\\dist\\main' } |
  % { Stop-Process -Id $_.ProcessId -Force }
```

## 2 bis. Panel web

```bash
npm run dev:web > "$TEMP/flotaos-web.log" 2>&1 &   # Next en :3001, webpack (nada de --turbo)
```

Al matarlo pasa lo mismo que con la API y **no basta con el patrón `next dev`**: queda vivo un
hijo `next/dist/server/lib/start-server.js` que sigue escuchando y el siguiente arranque muere con
EADDRINUSE en :3001. Búscalo por puerto:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen | % { Stop-Process -Id ---
name: verify
description: Levantar FlotaOS en local y ejercitar la API/web de verdad (HTTP contra :3000) para comprobar un cambio en tiempo de ejecución. Úsalo cuando haya que observar el comportamiento real, no correr tests.
---

# Verificar FlotaOS en runtime

Receta comprobada el 2026-08-19 (Windows 11, Git Bash + PowerShell).

## 1. Servicios de datos

```bash
docker compose up -d postgres redis minio   # el override sólo levanta datos; api/web van en el host
```

Si `docker info` falla, arranca Docker Desktop y espera:

```bash
powershell -c "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"
until docker info >/dev/null 2>&1; do sleep 3; done
```

## 2. API

**Node 20 obligatorio** y con la ruta explícita — el symlink de nvm puede revertir a v16 a media
sesión y el child que re-spawnea `nest start --watch` se queda sin `fetch` global:

```bash
export PATH="/c/Users/PC/AppData/Local/nvm/v20.20.2:$PATH"
npm run dev:api > "$TEMP/flotaos-api.log" 2>&1 &
until grep -q "successfully started" "$TEMP/flotaos-api.log"; do sleep 2; done
```

Escucha en `http://localhost:3000/api`. El watcher **recompila solo** al tocar ficheros: para
comparar contra el código sin el cambio basta `git stash` / `git stash pop` y esperar a que el
contador de `grep -c "successfully started"` suba (no hace falta reiniciar nada).

Al terminar, mátala por PID o el `dist/main` sobrevive y bloquea `prisma generate` con EPERM:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  ? { $_.CommandLine -match 'dev:api|@flotaos/api|nest start|apps\\api\\dist\\main' } |
  % { Stop-Process -Id $_.ProcessId -Force }
```

## 3. Autenticación

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flotaos.local","password":"Admin1234!"}' -o login.json
TOKEN=$(node -e "console.log(require('./login.json').accessToken)")
# luego: -H "Authorization: Bearer $TOKEN"
```

El bearer funciona en todos los endpoints; no hace falta lidiar con las cookies httpOnly.

## 4. Datos de prueba

La BD de dev trae poquísimas filas. Para fabricar fixtures sin pelearte con los NOT NULL,
**clona una fila existente** con una tabla temporal y cambia sólo lo único:

```sql
CREATE TEMP TABLE t AS SELECT * FROM viajes WHERE folio = 2;
UPDATE t SET id='test-a', folio=9001, "conductorId"=NULL, "trackingToken"='tok-a';
INSERT INTO viajes SELECT * FROM t;
```

Uniques a respetar: `viajes(folio, trackingToken)`, `conductores(curp, email, numeroEmpleado, usuario)`.
Se ejecuta con `docker exec -i floatos-postgres-1 psql -U flotaos_user -d flotaos <<'SQL' … SQL`
(`-tA` para salida limpia sin cabeceras).

Borra tus filas al terminar: `DELETE FROM viajes …` cascadea a escalas/historial sin problema.

## 5. Concurrencia

Para carreras (TOCTOU, doble reserva) lanza los curl en paralelo con `&` + `wait` y comprueba el
**estado en la BD**, no sólo los códigos HTTP:

```bash
asignar a > code-a & PA=$!
asignar b > code-b & PB=$!
wait $PA $PB
```

Dos curl lanzados así colisionan de forma fiable; con 5 rondas basta para ver el bug o su ausencia.

## Gotchas

- `$TEMP` dentro de `node -e "require('$TEMP/x.json')"` se mangla (las `\` de Windows desaparecen).
  Pasa rutas relativas o literales.
- `docker compose up` sin argumentos también levanta sólo los datos (api/web están tras el perfil `full`).
- Ojo con dos watchers a la vez: EADDRINUSE en :3000.
- Más hazards (Prisma/PostGIS/Turbopack) en la memoria `flotaos-entorno-node`.
.OwningProcess -Force }
```

Las páginas del panel se renderizan tras autenticarse en el cliente (token en localStorage), así
que un `curl` a `/configuracion` devuelve 200 con el cascarón: **no sirve para comprobar que un
campo nuevo aparece**. Para eso hace falta el navegador; si la extensión de Chrome no está
conectada, verifica el contrato por HTTP contra la API y deja constancia de que la UI no se revisó.

## 3. Autenticación

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flotaos.local","password":"Admin1234!"}' -o login.json
TOKEN=$(node -e "console.log(require('./login.json').accessToken)")
# luego: -H "Authorization: Bearer $TOKEN"
```

El bearer funciona en todos los endpoints; no hace falta lidiar con las cookies httpOnly.

## 4. Datos de prueba

La BD de dev trae poquísimas filas. Para fabricar fixtures sin pelearte con los NOT NULL,
**clona una fila existente** con una tabla temporal y cambia sólo lo único:

```sql
CREATE TEMP TABLE t AS SELECT * FROM viajes WHERE folio = 2;
UPDATE t SET id='test-a', folio=9001, "conductorId"=NULL, "trackingToken"='tok-a';
INSERT INTO viajes SELECT * FROM t;
```

Uniques a respetar: `viajes(folio, trackingToken)`, `conductores(curp, email, numeroEmpleado, usuario)`.
Se ejecuta con `docker exec -i floatos-postgres-1 psql -U flotaos_user -d flotaos <<'SQL' … SQL`
(`-tA` para salida limpia sin cabeceras).

Borra tus filas al terminar: `DELETE FROM viajes …` cascadea a escalas/historial sin problema.

## 5. Concurrencia

Para carreras (TOCTOU, doble reserva) lanza los curl en paralelo con `&` + `wait` y comprueba el
**estado en la BD**, no sólo los códigos HTTP:

```bash
asignar a > code-a & PA=$!
asignar b > code-b & PB=$!
wait $PA $PB
```

Dos curl lanzados así colisionan de forma fiable; con 5 rondas basta para ver el bug o su ausencia.

## Gotchas

- `$TEMP` dentro de `node -e "require('$TEMP/x.json')"` se mangla (las `\` de Windows desaparecen).
  Pasa rutas relativas o literales.
- `docker compose up` sin argumentos también levanta sólo los datos (api/web están tras el perfil `full`).
- Ojo con dos watchers a la vez: EADDRINUSE en :3000.
- Más hazards (Prisma/PostGIS/Turbopack) en la memoria `flotaos-entorno-node`.
