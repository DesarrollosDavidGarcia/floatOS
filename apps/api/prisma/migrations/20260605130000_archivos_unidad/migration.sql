-- CreateEnum
CREATE TYPE "CategoriaArchivoUnidad" AS ENUM ('POLIZA_SEGURO', 'GENERAL');

-- CreateTable
CREATE TABLE "archivos_unidad" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "categoria" "CategoriaArchivoUnidad" NOT NULL DEFAULT 'GENERAL',
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_unidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "archivos_unidad_unidadId_idx" ON "archivos_unidad"("unidadId");

-- CreateIndex
CREATE INDEX "archivos_unidad_unidadId_categoria_idx" ON "archivos_unidad"("unidadId", "categoria");

-- AddForeignKey
ALTER TABLE "archivos_unidad" ADD CONSTRAINT "archivos_unidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
