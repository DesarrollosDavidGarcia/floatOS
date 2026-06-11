-- Configuración de empresa (emisor, singleton) + sucursales de cliente.

CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT,
    "rfc" TEXT,
    "regimenFiscal" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "logoKey" TEXT,
    "calle" TEXT,
    "numeroExt" TEXT,
    "numeroInt" TEXT,
    "colonia" TEXT,
    "cp" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "pais" TEXT DEFAULT 'México',
    "permisoSctTipo" TEXT,
    "permisoSctNumero" TEXT,
    "aseguradoraRespCivil" TEXT,
    "polizaRespCivil" TEXT,
    "pacProveedor" TEXT DEFAULT 'SW',
    "pacAmbiente" TEXT DEFAULT 'PRUEBAS',
    "pacUsuario" TEXT,
    "pacToken" TEXT,
    "pacPassword" TEXT,
    "csdNumero" TEXT,
    "csdCerKey" TEXT,
    "csdKeyKey" TEXT,
    "csdPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sucursales_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "calle" TEXT,
    "numeroExt" TEXT,
    "numeroInt" TEXT,
    "colonia" TEXT,
    "cp" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "pais" TEXT DEFAULT 'México',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_cliente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sucursales_cliente_clienteId_idx" ON "sucursales_cliente"("clienteId");

ALTER TABLE "sucursales_cliente" ADD CONSTRAINT "sucursales_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
