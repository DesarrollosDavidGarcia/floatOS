-- Conceptos del costo de operación de la unidad (llantas, servicios, frenos…).
--
-- El costo por km dejaba de ser defendible al capturarse como un solo número al
-- tanteo. Desmenuzado en conceptos con su costo y su vida útil en kilómetros, la
-- suma de costo/vidaUtilKm da el mismo $/km pero se puede auditar y corregir por
-- partes. `Unidad.costoMantenimientoPorKm` se conserva como respaldo para las
-- unidades que no tengan conceptos capturados.
--
-- Aplicada con `migrate deploy` (migrate dev rompe con PostGIS; ver CLAUDE.md).

-- CreateTable
CREATE TABLE "conceptos_costo_unidad" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "vidaUtilKm" INTEGER NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceptos_costo_unidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conceptos_costo_unidad_unidadId_idx" ON "conceptos_costo_unidad"("unidadId");

-- AddForeignKey
ALTER TABLE "conceptos_costo_unidad" ADD CONSTRAINT "conceptos_costo_unidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
