# Scripts de operación — FlotaOS

Modelo **instancia-por-cliente** (sin multi-tenancy): cada cliente es un
`docker compose` independiente bajo `clientes/<nombre>/`. Las imágenes `api` y
`web` se **construyen una vez** y se publican a un registry; cada instancia solo
hace `pull`. Así todos corren el mismo binario y actualizar es rápido.

```
  TU MÁQUINA / CI                      REGISTRY                 VPS (N clientes)
  build-publicar.sh  ──build+push──▶  flotaos-api:1.1.0  ──pull──▶  clientes/*/
                                      flotaos-web:1.1.0
```

## Requisitos
- Docker + Docker Compose v2
- En Windows: correr estos `.sh` desde **Git Bash** o **WSL**
- `openssl` y `curl` en el PATH (vienen con Git Bash)

## 1. Publicar una versión nueva (tu máquina / CI)

```bash
docker login ghcr.io          # una vez (necesario para --push)
git tag v1.1.0                # etiqueta la versión
./scripts/build-publicar.sh 1.1.0 --push
```

Sube `flotaos-api:1.1.0` y `flotaos-web:1.1.0` (+ `latest`). La URL de API/WS del
panel se hornea como ruta **relativa**, por eso una sola imagen `web` sirve a
cualquier cliente.

## 2. Alta de un cliente nuevo (VPS)

```bash
./scripts/alta-cliente.sh empresa-xyz 1.1.0              # puertos 80/443
./scripts/alta-cliente.sh empresa-abc 1.1.0 8081 8443    # 2ª en el mismo VPS
```

Crea `clientes/<nombre>/` con secretos aleatorios, levanta los servicios
(`pull` + `up`), aplica migraciones + seed de catálogos (automático al arrancar
el API) y crea el usuario admin. Imprime las credenciales **una sola vez** y
borra el password del `.env` (ya quedó hasheado en la BD).

> Varias instancias en el mismo VPS: dale puertos distintos a cada una con los
> argumentos `[http_port] [https_port]` y enruta por subdominio en un Nginx del host.

## 3. Actualizar instancias (VPS)

```bash
# Una sola
./scripts/actualizar-cliente.sh clientes/empresa-xyz 1.1.0

# Todas
./scripts/actualizar-todos.sh 1.1.0
```

Cada actualización: **backup `pg_dump`** → fija `FLOTAOS_VERSION` → `pull` →
recrea solo `api` y `web` → verifica `/api/health`. Postgres/Redis/MinIO no se
tocan. Las migraciones corren solas al arrancar el API.

## Producción con HTTPS por subdominio (Traefik)

Para varios clientes con dominio propio y TLS automático, se usa un proxy de
borde **Traefik** (ver `infra/traefik/`). Una vez levantado Traefik en el VPS,
cada instancia se engancha así (con `CLIENT_DOMAIN` y `CLIENT_NAME` en su `.env`):

```bash
cd clientes/empresa-xyz
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```

En este modo el nginx por instancia no arranca: Traefik termina HTTPS y enruta
`Host(dominio)` → `web`, y `/api` + `/socket.io` → `api`. Es **un solo salto**
(reemplaza al nginx), no agrega latencia perceptible.

## Backups automáticos (Postgres + MinIO)

```bash
./scripts/backup-cliente.sh clientes/empresa-xyz 14   # una, retención 14 días
./scripts/backup-todos.sh 14                           # todas
```

`pg_dump` es online (no bloquea la app); ejecútalo de madrugada. Para enviar a
almacenamiento externo (recomendado: si el VPS muere no pierdes datos), define
`RCLONE_REMOTE` con un remoto de [rclone](https://rclone.org) ya configurado.

Cron diario 3am:
```cron
0 3 * * * cd /ruta/al/repo && RCLONE_REMOTE="b2:bucket/flotaos" ./scripts/backup-todos.sh 14 >> /var/log/flotaos-backup.log 2>&1
```

## Backup / restauración manual

```bash
cd clientes/empresa-xyz
docker compose exec -T postgres pg_dump -U flotaos_user flotaos > backups/manual-$(date +%F).sql
docker compose exec -T postgres psql  -U flotaos_user flotaos < backups/manual-2026-06-06.sql
```

## Suspender / reactivar (pago caído)

```bash
cd clientes/empresa-xyz
docker compose stop     # suspender
docker compose start    # reactivar
```

## Notas
- `clientes/` está en `.gitignore`: contiene secretos por cliente, no se versiona.
- Reglas de migración (críticas porque corren contra N bases en producción):
  siempre aditivas/compatibles hacia atrás, nunca editar una ya aplicada,
  siempre con backup previo (los scripts ya lo hacen).
