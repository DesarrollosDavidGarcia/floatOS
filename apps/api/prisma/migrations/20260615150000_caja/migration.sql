-- CreateTable
CREATE TABLE "cajas" (
    "id" TEXT NOT NULL,
    "placas" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "anio" INTEGER,
    "capacidadKg" DECIMAL(10,2),
    "capacidadM3" DECIMAL(10,3),
    "aseguradora" TEXT,
    "numeroPoliza" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cajas_placas_key" ON "cajas"("placas");

-- AlterTable
ALTER TABLE "viajes" ADD COLUMN "cajaId" TEXT;

-- CreateIndex
CREATE INDEX "viajes_cajaId_idx" ON "viajes"("cajaId");

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "cajas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "historial_asignacion_viaje" ADD COLUMN "cajaAnterior" TEXT,
ADD COLUMN "cajaNueva" TEXT;
