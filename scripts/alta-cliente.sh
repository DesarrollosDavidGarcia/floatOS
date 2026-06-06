#!/usr/bin/env bash
set -euo pipefail
#
# Da de alta una instancia nueva de cliente bajo clientes/<nombre>/.
# Genera secretos aleatorios, levanta los servicios (pull) y crea el usuario
# admin. Las migraciones y el seed de catálogos los aplica el API al arrancar.
#
# Uso:  ./scripts/alta-cliente.sh <nombre-cliente> [version] [http_port] [https_port]
#   ej. ./scripts/alta-cliente.sh empresa-xyz 1.1.0
#       ./scripts/alta-cliente.sh empresa-abc 1.1.0 8081 8443   # 2ª en el mismo VPS
#
# Para varias instancias en el mismo VPS dale puertos distintos a cada una y
# enruta por subdominio en el Nginx del host.

cd "$(dirname "$0")/.."

CLIENTE="${1:?Uso: alta-cliente.sh <nombre-cliente> [version] [http_port] [https_port]}"
VERSION="${2:-latest}"
HTTP_PORT="${3:-80}"
HTTPS_PORT="${4:-443}"
DEST="clientes/$CLIENTE"

[ -e "$DEST" ] && { echo "✗ Ya existe $DEST. Aborta." >&2; exit 1; }

echo "→ Creando $DEST ..."
mkdir -p "$DEST/backups" "$DEST/nginx/certs"
# Solo archivos de PRODUCCIÓN. Nunca docker-compose.override.yml (es de dev:
# pone api/web/nginx tras un perfil y expone los puertos de datos al host).
cp docker-compose.yml "$DEST/"
cp -r nginx/. "$DEST/nginx/"
cp -r postgres "$DEST/"
cp .env.example "$DEST/.env"

echo "→ Generando secretos en $DEST/.env ..."
gen() { openssl rand -hex 24; }
DB_PASS="$(gen)"
JWT="$(gen)$(gen)"
JWT_R="$(gen)$(gen)"
MINIO_KEY="$(gen)"
MINIO_SECRET="$(gen)"
ADMIN_EMAIL="admin@$CLIENTE.com"
ADMIN_PASS="$(openssl rand -base64 12)"

set_env() { sed -i "s|^$1=.*|$1=$2|" "$DEST/.env"; }
set_env FLOTAOS_VERSION "$VERSION"
set_env POSTGRES_PASSWORD "$DB_PASS"
set_env DATABASE_URL "postgresql://flotaos_user:$DB_PASS@postgres:5432/flotaos?schema=public"
set_env JWT_SECRET "$JWT"
set_env JWT_REFRESH_SECRET "$JWT_R"
set_env MINIO_ACCESS_KEY "$MINIO_KEY"
set_env MINIO_SECRET_KEY "$MINIO_SECRET"
set_env ADMIN_EMAIL "$ADMIN_EMAIL"
set_env ADMIN_PASSWORD "$ADMIN_PASS"
set_env NGINX_HTTP_PORT "$HTTP_PORT"
set_env NGINX_HTTPS_PORT "$HTTPS_PORT"

cd "$DEST"

echo "→ Pull de imágenes y arranque (puertos $HTTP_PORT/$HTTPS_PORT)..."
docker compose pull
docker compose up -d

echo "→ Esperando a que el API migre, siembre catálogos y arranque..."
ok=""
for _ in $(seq 1 45); do
  if curl -fsS "http://localhost:$HTTP_PORT/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
[ -z "$ok" ] && { echo "✗ El API no respondió. Revisa: (cd $DEST && docker compose logs api)" >&2; exit 1; }

echo "→ Creando usuario admin..."
docker compose exec -T \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASS" \
  -e ADMIN_NOMBRE="Administrador" \
  api node prisma/seed-admin.mjs

# El password ya quedó hasheado en la BD; no tiene por qué seguir en texto plano
# en el .env. Se vacía (el admin lo cambia tras el primer login).
sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=|" .env

cat <<INFO

════════════════════════════════════════════════════
✓ Instancia '$CLIENTE' lista — versión $VERSION
  Carpeta:  $DEST
  Puertos:  $HTTP_PORT (http) / $HTTPS_PORT (https)
  Admin:    $ADMIN_EMAIL
  Password: $ADMIN_PASS
  ⚠ Guarda estas credenciales: el password no se vuelve a mostrar
    (se borró del .env tras crear el usuario).
════════════════════════════════════════════════════
INFO
