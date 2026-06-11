-- Documentos del conductor: de un solo archivo (archivoKey) a N archivos por
-- documento (tabla archivos_documento_conductor, PDF o imagen en MinIO).

ALTER TABLE "documentos_conductor" DROP COLUMN "archivoKey";

CREATE TABLE "archivos_documento_conductor" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_documento_conductor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "archivos_documento_conductor_documentoId_idx" ON "archivos_documento_conductor"("documentoId");

ALTER TABLE "archivos_documento_conductor" ADD CONSTRAINT "archivos_documento_conductor_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_conductor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
