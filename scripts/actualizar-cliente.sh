#!/usr/bin/env bash
set -euo pipefail
#
# Actualiza UNA instancia: backup -> fija versión -> pull -> recrea api/web.
# Las migraciones pendientes y el seed de catálogos corren solos al arrancar el
# API. Postgres/Redis/MinIO no se tocan (sus volúmenes persisten).
#
# Uso:  ./scripts/actualizar-cliente.sh <ruta-instancia> <version>
#   ej. ./scripts/actualizar-cliente.sh clientes/empresa-xyz 1.1.0

DIR="${1:?Uso: actualizar-cliente.sh <ruta-instancia> <version>}"
VERSION="${2:?Falta la versión}"

[ -f "$DIR/docker-compose.yml" ] || { echo "✗ $DIR no parece una instancia." >&2; exit 1; }
cd "$DIR"

# Versión actual, para poder revertir si la actualización falla.
PREV_VERSION="$(grep -E '^FLOTAOS_VERSION=' .env | cut -d= -f2)"; PREV_VERSION="${PREV_VERSION:-latest}"

STAMP="$(date +%F-%H%M)"
mkdir -p backups
BACKUP="backups/pre-$VERSION-$STAMP.sql"

echo "→ [$DIR] Backup previo → $BACKUP"
docker compose exec -T postgres pg_dump -U flotaos_user flotaos > "$BACKUP"
# Aborta si el backup salió vacío (p. ej. postgres caído): no actualizamos sin red de seguridad.
if [ ! -s "$BACKUP" ]; then
  echo "✗ [$DIR] El backup quedó vacío. ¿Postgres arriba? Aborto sin tocar nada." >&2
  rm -f "$BACKUP"
  exit 1
fi

echo "→ [$DIR] Fijando FLOTAOS_VERSION=$VERSION (previa: $PREV_VERSION)"
sed -i "s|^FLOTAOS_VERSION=.*|FLOTAOS_VERSION=$VERSION|" .env

echo "→ [$DIR] Pull + recreación de api y web"
docker compose pull api web
docker compose up -d api web

PORT="$(grep -E '^NGINX_HTTP_PORT=' .env | cut -d= -f2)"; PORT="${PORT:-80}"
echo "→ [$DIR] Verificando salud en :$PORT ..."
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    echo "✓ [$DIR] Actualizado a $VERSION (health OK)"
    exit 0
  fi
  sleep 2
done

echo "✗ [$DIR] El health no respondió tras actualizar." >&2
echo "  Logs:     (cd $DIR && docker compose logs api)" >&2
echo "  Rollback de imagen (si la migración es compatible):" >&2
echo "            (cd $DIR && sed -i 's|^FLOTAOS_VERSION=.*|FLOTAOS_VERSION=$PREV_VERSION|' .env && docker compose up -d api web)" >&2
echo "  Restaurar BD (si la migración rompió datos):" >&2
echo "            (cd $DIR && docker compose exec -T postgres psql -U flotaos_user flotaos < $BACKUP)" >&2
echo "  ⚠ No se hace rollback automático: si la migración no es compatible hacia atrás," >&2
echo "    bajar la imagen sin restaurar la BD puede dejar la instancia inconsistente." >&2
exit 1
