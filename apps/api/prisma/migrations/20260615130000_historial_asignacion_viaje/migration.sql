-- CreateTable
CREATE TABLE "historial_asignacion_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "unidadAnterior" TEXT,
    "unidadNueva" TEXT,
    "conductorAnterior" TEXT,
    "conductorNuevo" TEXT,
    "motivo" TEXT,
    "nota" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_asignacion_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historial_asignacion_viaje_viajeId_idx" ON "historial_asignacion_viaje"("viajeId");

-- AddForeignKey
ALTER TABLE "historial_asignacion_viaje" ADD CONSTRAINT "historial_asignacion_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
