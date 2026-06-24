-- Chat por viaje: comunicación bidireccional monitorista ↔ conductor con adjuntos.
-- CreateEnum
CREATE TYPE "AutorMensaje" AS ENUM ('MONITORISTA', 'CONDUCTOR');

-- CreateTable
CREATE TABLE "mensajes_chat" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "autorTipo" "AutorMensaje" NOT NULL,
    "usuarioId" TEXT,
    "conductorId" TEXT,
    "autorNombre" TEXT NOT NULL,
    "texto" TEXT,
    "archivoKey" TEXT,
    "archivoNombre" TEXT,
    "archivoTipo" TEXT,
    "archivoBytes" INTEGER,
    "leidoMonitorista" BOOLEAN NOT NULL DEFAULT false,
    "leidoConductor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensajes_chat_viajeId_createdAt_idx" ON "mensajes_chat"("viajeId", "createdAt");

-- AddForeignKey
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
