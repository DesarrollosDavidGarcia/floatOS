-- AlterTable: campos del motor de cálculo en unidades
ALTER TABLE "unidades" ADD COLUMN     "capacidadM3" DECIMAL(10,3),
ADD COLUMN     "capacidadTanqueL" DECIMAL(8,2),
ADD COLUMN     "rendimientoKmL" DECIMAL(6,2);

-- AlterTable: snapshot del motor en viajes
ALTER TABLE "viajes" ADD COLUMN     "distanciaEstimadaKm" DECIMAL(10,2),
ADD COLUMN     "pesoMaxKg" DECIMAL(10,2),
ADD COLUMN     "volumenMaxM3" DECIMAL(10,3);

-- CreateTable: escalas del itinerario.
-- NOTA: "ubicacion" es una columna geography GENERADA a partir de lat/lng (PostGIS);
-- Prisma la conoce como Unsupported(...) pero el ADD COLUMN se reemplaza aquí por
-- la versión GENERATED ALWAYS AS (...) STORED para poder indexarla con GIST.
CREATE TABLE "escalas_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "ubicacion" geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography) STORED,
    "notas" TEXT,
    "ventanaDesde" TIMESTAMP(3),
    "ventanaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cargas (recoger/entregar) por escala
CREATE TABLE "cargas_escala" (
    "id" TEXT NOT NULL,
    "escalaId" TEXT NOT NULL,
    "sentido" TEXT NOT NULL,
    "tipoCarga" TEXT NOT NULL,
    "descripcion" TEXT,
    "pesoKg" DECIMAL(10,2) NOT NULL,
    "volumenM3" DECIMAL(10,3),
    "largoM" DECIMAL(8,3),
    "anchoM" DECIMAL(8,3),
    "altoM" DECIMAL(8,3),
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "loteRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargas_escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reglas de compatibilidad carga↔unidad
CREATE TABLE "compatibilidad_carga_unidad" (
    "id" TEXT NOT NULL,
    "tipoCarga" TEXT NOT NULL,
    "tipoUnidad" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT true,
    "nota" TEXT,

    CONSTRAINT "compatibilidad_carga_unidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escalas_viaje_viajeId_idx" ON "escalas_viaje"("viajeId");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_viaje_viajeId_orden_key" ON "escalas_viaje"("viajeId", "orden");

-- CreateIndex: índice espacial GIST sobre la columna geography generada
CREATE INDEX "escalas_viaje_ubicacion_gist" ON "escalas_viaje" USING GIST ("ubicacion");

-- CreateIndex
CREATE INDEX "cargas_escala_escalaId_idx" ON "cargas_escala"("escalaId");

-- CreateIndex
CREATE UNIQUE INDEX "compatibilidad_carga_unidad_tipoCarga_tipoUnidad_key" ON "compatibilidad_carga_unidad"("tipoCarga", "tipoUnidad");

-- AddForeignKey
ALTER TABLE "escalas_viaje" ADD CONSTRAINT "escalas_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargas_escala" ADD CONSTRAINT "cargas_escala_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "escalas_viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;
