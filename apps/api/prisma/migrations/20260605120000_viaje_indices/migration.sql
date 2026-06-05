-- Optimiza el listado de viajes: filtro por estado + orden por createdAt,
-- filtro de rango por fechaProgramada y orden por defecto por createdAt.

-- DropIndex
DROP INDEX "viajes_estado_idx";

-- CreateIndex
CREATE INDEX "viajes_estado_createdAt_idx" ON "viajes"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "viajes_fechaProgramada_idx" ON "viajes"("fechaProgramada");

-- CreateIndex
CREATE INDEX "viajes_createdAt_idx" ON "viajes"("createdAt");
