-- Caché persistente de rutas por carretera (TomTom) para no repetir llamadas.
CREATE TABLE "ruta_cache" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "tiempoMin" DOUBLE PRECISION,
    "proveedor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ruta_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ruta_cache_clave_key" ON "ruta_cache"("clave");
