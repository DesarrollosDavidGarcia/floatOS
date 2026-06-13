-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "viajeId" TEXT NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "params" JSONB NOT NULL,
    "distanciaKm" DECIMAL(10,2),
    "pesoKg" DECIMAL(10,2),
    "numEscalas" INTEGER NOT NULL DEFAULT 0,
    "desglose" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "iva" DECIMAL(12,2) NOT NULL,
    "retencion" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "enviadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_folio_key" ON "cotizaciones"("folio");

-- CreateIndex
CREATE INDEX "cotizaciones_viajeId_idx" ON "cotizaciones"("viajeId");

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
