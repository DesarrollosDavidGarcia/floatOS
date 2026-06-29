-- Manifiesto de pasajeros para viajes de transporte de personal.
-- CreateTable
CREATE TABLE "pasajeros_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificacion" TEXT,
    "telefono" TEXT,
    "escalaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pasajeros_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pasajeros_viaje_viajeId_idx" ON "pasajeros_viaje"("viajeId");

-- CreateIndex
CREATE INDEX "pasajeros_viaje_escalaId_idx" ON "pasajeros_viaje"("escalaId");

-- AddForeignKey
ALTER TABLE "pasajeros_viaje" ADD CONSTRAINT "pasajeros_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajeros_viaje" ADD CONSTRAINT "pasajeros_viaje_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "escalas_viaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

