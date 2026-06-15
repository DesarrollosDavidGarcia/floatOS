-- CreateTable
CREATE TABLE "contactos_escala" (
    "id" TEXT NOT NULL,
    "escalaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "notificadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_escala_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contactos_escala_escalaId_idx" ON "contactos_escala"("escalaId");

-- AddForeignKey
ALTER TABLE "contactos_escala" ADD CONSTRAINT "contactos_escala_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "escalas_viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;
