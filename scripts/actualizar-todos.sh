#!/usr/bin/env bash
set -euo pipefail
#
# Actualiza TODAS las instancias en clientes/* a una versión, una por una.
# Se detiene por instancia si el health falla, pero continúa con las demás y
# reporta al final cuáles fallaron.
#
# Uso:  ./scripts/actualizar-todos.sh <version>
#   ej. ./scripts/actualizar-todos.sh 1.1.0

cd "$(dirname "$0")/.."
VERSION="${1:?Uso: actualizar-todos.sh <version>}"
ACTUALIZAR="$(pwd)/scripts/actualizar-cliente.sh"

[ -d clientes ] || { echo "No hay carpeta clientes/." >&2; exit 1; }

fallidos=()
for dir in clientes/*/; do
  [ -f "$dir/docker-compose.yml" ] || continue
  echo "════════════════════════════════════════════════════"
  if ! "$ACTUALIZAR" "$dir" "$VERSION"; then
    fallidos+=("$dir")
  fi
done

echo "════════════════════════════════════════════════════"
if [ ${#fallidos[@]} -eq 0 ]; then
  echo "✓ Todas las instancias actualizadas a $VERSION"
else
  echo "✗ Fallaron ${#fallidos[@]}: ${fallidos[*]}" >&2
  exit 1
fi
