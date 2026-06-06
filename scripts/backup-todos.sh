#!/usr/bin/env bash
set -euo pipefail
#
# Respalda TODAS las instancias en clientes/*. Pensado para correr por cron.
#
# Uso:  ./scripts/backup-todos.sh [retencion_dias]
#
# Cron diario 3am (offsite opcional vía RCLONE_REMOTE):
#   0 3 * * * cd /ruta/al/repo && RCLONE_REMOTE="b2:bucket/flotaos" \
#             ./scripts/backup-todos.sh 14 >> /var/log/flotaos-backup.log 2>&1

cd "$(dirname "$0")/.."
RET="${1:-14}"
BACKUP="$(pwd)/scripts/backup-cliente.sh"

[ -d clientes ] || { echo "No hay carpeta clientes/." >&2; exit 1; }

fallidos=()
for dir in clientes/*/; do
  [ -f "$dir/docker-compose.yml" ] || continue
  if ! "$BACKUP" "$dir" "$RET"; then
    fallidos+=("$dir")
  fi
done

if [ ${#fallidos[@]} -eq 0 ]; then
  echo "✓ Backups completados ($(date +%F-%H%M))"
else
  echo "✗ Backups con fallos: ${fallidos[*]}" >&2
  exit 1
fi
