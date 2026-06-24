-- Búsqueda del listado de viajes (ListarViajesUseCase): hoy hace ILIKE '%término%'
-- multi-columna (origenDireccion, destinoDireccion, tipoCarga, descripcionCarga en
-- "viajes" + razonSocial del cliente vía join). Un patrón '%x%' no usa índices btree,
-- así que provocaba seq scan (hallazgo de performance de la auditoría 2026-06-24).
-- Solución: índices GIN trigram (pg_trgm), que sí aceleran ILIKE/contains no anclados.
--
-- Estos índices se gestionan por SQL crudo (no como @@index en schema.prisma) porque
-- Prisma generaría un índice btree, inútil para '%x%'. Ver comentario en los modelos
-- Viaje y Cliente del schema.
--
-- NOTA (orquestador): CREATE EXTENSION pg_trgm requiere privilegios; el superusuario
-- del Postgres de Docker los tiene. Confirmar al aplicar.

-- Extensión de similitud por trigramas (provee gin_trgm_ops).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Columnas de "viajes" buscadas con ILIKE '%x%'. Nombres físicos camelCase y
-- case-sensitive (sin @map a snake_case; ver migración init y schema.prisma).
CREATE INDEX IF NOT EXISTS "viajes_origenDireccion_trgm_idx"
  ON "viajes" USING gin ("origenDireccion" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "viajes_destinoDireccion_trgm_idx"
  ON "viajes" USING gin ("destinoDireccion" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "viajes_tipoCarga_trgm_idx"
  ON "viajes" USING gin ("tipoCarga" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "viajes_descripcionCarga_trgm_idx"
  ON "viajes" USING gin ("descripcionCarga" gin_trgm_ops);

-- razonSocial del cliente (la búsqueda hace ILIKE '%x%' sobre el cliente relacionado).
CREATE INDEX IF NOT EXISTS "clientes_razonSocial_trgm_idx"
  ON "clientes" USING gin ("razonSocial" gin_trgm_ops);
