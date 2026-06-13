-- Cliente: reemplaza el contacto único embebido por una lista de contactos
-- (tabla contactos_cliente) y agrega datos fiscales CFDI 4.0.

-- AlterTable: quitar columnas de contacto único
ALTER TABLE "clientes" DROP COLUMN "contactoNombre";
ALTER TABLE "clientes" DROP COLUMN "contactoTelefono";
ALTER TABLE "clientes" DROP COLUMN "contactoEmail";

-- AlterTable: datos fiscales (códigos de catálogo SAT)
ALTER TABLE "clientes" ADD COLUMN "regimenFiscal" TEXT;
ALTER TABLE "clientes" ADD COLUMN "usoCfdi" TEXT;
ALTER TABLE "clientes" ADD COLUMN "cpFiscal" TEXT;
ALTER TABLE "clientes" ADD COLUMN "emailFacturacion" TEXT;

-- CreateTable: contactos del cliente (1-a-muchos)
CREATE TABLE "contactos_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contactos_cliente_clienteId_idx" ON "contactos_cliente"("clienteId");

-- AddForeignKey
ALTER TABLE "contactos_cliente" ADD CONSTRAINT "contactos_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
