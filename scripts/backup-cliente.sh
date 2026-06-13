#!/usr/bin/env bash
set -euo pipefail
#
# Respaldo de UNA instancia: Postgres (pg_dump gz) + datos de MinIO (tar del
# volumen), con retención local. pg_dump es online (no bloquea la app).
# Offsite OPCIONAL: si RCLONE_REMOTE está definido, copia los backups allá.
#
# Uso:  ./scripts/backup-cliente.sh <ruta-instancia> [retencion_dias]
#   ej. ./scripts/backup-cliente.sh clientes/empresa-xyz 14
#
# Offsite:  export RCLONE_REMOTE="b2:mi-bucket/flotaos"   (rclone ya configurado)

DIR="${1:?Uso: backup-cliente.sh <ruta-instancia> [retencion_dias]}"
RET="${2:-14}"
[ -f "$DIR/docker-compose.yml" ] || { echo "✗ $DIR no parece una instancia." >&2; exit 1; }
cd "$DIR"

CLIENTE="$(basename "$DIR")"
STAMP="$(date +%F-%H%M)"
mkdir -p backups

# --- Postgres ---
DB="backups/db-$STAMP.sql.gz"
echo "→ [$CLIENTE] Dump de Postgres → $DB"
docker compose exec -T postgres pg_dump -U flotaos_user flotaos | gzip > "$DB"
[ -s "$DB" ] || { echo "✗ [$CLIENTE] Dump vacío (¿Postgres arriba?). Aborto." >&2; rm -f "$DB"; exit 1; }

# --- MinIO (tar del volumen vía contenedor efímero) ---
MINIO_VOL="$(docker compose ps -q minio | xargs -r docker inspect \
  -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}')"
if [ -n "$MINIO_VOL" ]; then
  OBJ="backups/minio-$STAMP.tgz"
  echo "→ [$CLIENTE] Archivos de MinIO → $OBJ"
  docker run --rm -v "$MINIO_VOL":/data:ro -v "$PWD/backups":/backup alpine \
    tar czf "/backup/minio-$STAMP.tgz" -C /data . 2>/dev/null \
    || echo "  (aviso: MinIO sin datos o no respaldado)"
else
  echo "  (aviso: no se encontró el volumen de MinIO; ¿la instancia está arriba?)"
fi

# --- Retención local ---
echo "→ [$CLIENTE] Retención: elimino backups con más de $RET días"
find backups -name 'db-*.sql.gz' -mtime +"$RET" -delete 2>/dev/null || true
find backups -name 'minio-*.tgz' -mtime +"$RET" -delete 2>/dev/null || true

# --- Offsite opcional ---
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "→ [$CLIENTE] Offsite → $RCLONE_REMOTE/$CLIENTE"
  rclone copy backups "$RCLONE_REMOTE/$CLIENTE" \
    --include 'db-*.sql.gz' --include 'minio-*.tgz'
fi

echo "✓ [$CLIENTE] Backup OK ($STAMP)"
