-- ETA estimada por carretera (free-flow) como snapshot del viaje.
ALTER TABLE "viajes" ADD COLUMN IF NOT EXISTS "tiempoEstimadoMin" DOUBLE PRECISION;

-- Índice para la poda por antigüedad de la caché de rutas.
CREATE INDEX IF NOT EXISTS "ruta_cache_createdAt_idx" ON "ruta_cache"("createdAt");
