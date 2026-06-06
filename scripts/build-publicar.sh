#!/usr/bin/env bash
set -euo pipefail
#
# Construye y publica las imágenes flotaos-api y flotaos-web al registry.
# Se corre en TU máquina o en CI, una sola vez por versión. Las instancias de
# cliente solo hacen `docker compose pull` de estas imágenes.
#
# Uso:
#   ./scripts/build-publicar.sh 1.1.0           # build local (no publica)
#   ./scripts/build-publicar.sh 1.1.0 --push    # build + publica al registry
#   ./scripts/build-publicar.sh                 # versión = git describe
#
# Variables:
#   IMAGE_REGISTRY  (def: ghcr.io/desarrollosdavidgarcia)

cd "$(dirname "$0")/.."

VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo dev)}"
PUSH="${2:-}"
export FLOTAOS_VERSION="$VERSION"
export IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/desarrollosdavidgarcia}"

echo "→ Construyendo flotaos-api y flotaos-web :$VERSION"
echo "  Registry: $IMAGE_REGISTRY"
docker compose -f docker-compose.yml -f docker-compose.build.yml build api web

# Etiqueta 'latest' de conveniencia además de la versión.
docker tag "$IMAGE_REGISTRY/flotaos-api:$VERSION" "$IMAGE_REGISTRY/flotaos-api:latest"
docker tag "$IMAGE_REGISTRY/flotaos-web:$VERSION" "$IMAGE_REGISTRY/flotaos-web:latest"

if [ "$PUSH" = "--push" ]; then
  # Comprueba sesión en el registry; publicar sin login falla a mitad.
  REG_HOST="${IMAGE_REGISTRY%%/*}"
  if ! docker login "$REG_HOST" </dev/null >/dev/null 2>&1; then
    echo "✗ No hay sesión en $REG_HOST. Corre primero: docker login $REG_HOST" >&2
    exit 1
  fi
  echo "→ Publicando al registry..."
  docker compose -f docker-compose.yml push api web
  docker push "$IMAGE_REGISTRY/flotaos-api:latest"
  docker push "$IMAGE_REGISTRY/flotaos-web:latest"
  echo "✓ Publicado $VERSION (+ latest)"
else
  echo "✓ Build local listo ($VERSION). Agrega --push para publicar."
fi
