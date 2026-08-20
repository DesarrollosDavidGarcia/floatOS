-- Revisión del vehículo a la salida y a la llegada del viaje.
--
-- Es la puerta de entrada del odómetro real, que existía como columna en viajes
-- pero no tenía forma de capturarse. La revisión es obligatoria para avanzar el
-- estado del viaje, y esa regla vive en el backend para que no se salte desde la
-- app ni desde el panel.
--
-- Aplicada con `migrate deploy` (migrate dev rompe con PostGIS; ver CLAUDE.md).

-- CreateEnum
CREATE TYPE "TipoRevisionViaje" AS ENUM ('SALIDA', 'LLEGADA');

-- CreateEnum
CREATE TYPE "OrigenRevision" AS ENUM ('CONDUCTOR', 'MONITORISTA');

-- CreateTable
CREATE TABLE "revisiones_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "tipo" "TipoRevisionViaje" NOT NULL,
    "odometro" INTEGER NOT NULL,
    "nivelCombustiblePct" INTEGER,
    "fotoTableroKey" TEXT,
    "checklist" JSONB,
    "novedades" TEXT,
    "origen" "OrigenRevision" NOT NULL DEFAULT 'CONDUCTOR',
    "capturadaPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisiones_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revisiones_viaje_viajeId_tipo_key" ON "revisiones_viaje"("viajeId", "tipo");

-- CreateIndex
CREATE INDEX "revisiones_viaje_viajeId_idx" ON "revisiones_viaje"("viajeId");

-- AddForeignKey
ALTER TABLE "revisiones_viaje" ADD CONSTRAINT "revisiones_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
