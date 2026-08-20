-- Cimientos del margen real por viaje (apuesta 1, fase 1): ingreso del viaje,
-- costos de flota y conductor, precio del diesel y marca de salida de escala.
--
-- Escrita a mano y aplicada con `prisma migrate deploy`: `migrate dev` no puede
-- correr en este proyecto porque la shadow DB no tiene PostGIS (ver CLAUDE.md).

-- ── Ingreso del viaje ──────────────────────────────────────────────
-- AlterTable
ALTER TABLE "viajes" ADD COLUMN "precioAcordado" DECIMAL(12,2);
ALTER TABLE "viajes" ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'MXN';

-- Backfill: hasta ahora el ingreso solo existía en la cotización ACEPTADA.
-- DISTINCT ON toma la más reciente por si un viaje acumuló más de una aceptada.
UPDATE "viajes" v
SET "precioAcordado" = c."total",
    "moneda"         = c."moneda"
FROM (
    SELECT DISTINCT ON ("viajeId") "viajeId", "total", "moneda"
    FROM "cotizaciones"
    WHERE "estado" = 'ACEPTADA'
    ORDER BY "viajeId", "updatedAt" DESC
) c
WHERE c."viajeId" = v."id"
  AND v."precioAcordado" IS NULL;

-- ── Costos de la unidad ────────────────────────────────────────────
-- AlterTable
ALTER TABLE "unidades" ADD COLUMN "costoMantenimientoPorKm" DECIMAL(8,2);
ALTER TABLE "unidades" ADD COLUMN "costoFijoMensual" DECIMAL(10,2);

-- ── Componentes de pago del conductor ──────────────────────────────
-- AlterTable
ALTER TABLE "conductores" ADD COLUMN "sueldoPeriodo" DECIMAL(10,2);
ALTER TABLE "conductores" ADD COLUMN "periodicidadSueldo" TEXT;
ALTER TABLE "conductores" ADD COLUMN "tarifaPorViaje" DECIMAL(10,2);
ALTER TABLE "conductores" ADD COLUMN "pagoPorKm" DECIMAL(8,2);
ALTER TABLE "conductores" ADD COLUMN "porcentajeFlete" DECIMAL(5,2);

-- ── Combustible real del ticket ────────────────────────────────────
-- AlterTable
ALTER TABLE "gastos_viaje" ADD COLUMN "litros" DECIMAL(8,2);
ALTER TABLE "gastos_viaje" ADD COLUMN "precioPorLitro" DECIMAL(8,3);

-- ── Salida de escala (cierra la estancia; habilita medir la demora) ─
-- AlterTable
ALTER TABLE "escalas_viaje" ADD COLUMN "salidaRegistradaEn" TIMESTAMP(3);

-- ── Catálogo de precio del diesel con vigencia ─────────────────────
-- CreateTable
CREATE TABLE "precios_diesel" (
    "id" TEXT NOT NULL,
    "precioPorLitro" DECIMAL(8,3) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precios_diesel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "precios_diesel_vigenteDesde_key" ON "precios_diesel"("vigenteDesde");
