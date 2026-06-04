-- CreateEnum
CREATE TYPE "EstadoViaje" AS ENUM ('ASIGNADO', 'ACEPTADO', 'EN_CAMINO_ORIGEN', 'CARGANDO', 'EN_TRANSITO', 'ENTREGADO', 'FACTURADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoUnidad" AS ENUM ('VERIFICACION', 'SEGURO', 'TARJETA_CIRCULACION', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoConductor" AS ENUM ('LICENCIA_FEDERAL', 'EXAMEN_MEDICO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('COMBUSTIBLE', 'CASETA', 'VIATICOS', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCartaPorte" AS ENUM ('BORRADOR', 'PENDIENTE_TIMBRAR', 'TIMBRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('BORRADOR', 'ENVIADA', 'PAGADA', 'VENCIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conductores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "usuario" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "telefono" TEXT,
    "fotoKey" TEXT,
    "refreshTokenHash" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conductores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "placas" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "anio" INTEGER,
    "capacidadKg" DECIMAL(10,2),
    "aseguradora" TEXT,
    "numeroPoliza" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_unidad" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "tipo" "TipoDocumentoUnidad" NOT NULL,
    "descripcion" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "archivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoDocumentoConductor" NOT NULL,
    "numero" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "archivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "contactoNombre" TEXT,
    "contactoTelefono" TEXT,
    "contactoEmail" TEXT,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viajes" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "unidadId" TEXT,
    "conductorId" TEXT,
    "origenDireccion" TEXT NOT NULL,
    "origenLat" DOUBLE PRECISION,
    "origenLng" DOUBLE PRECISION,
    "destinoDireccion" TEXT NOT NULL,
    "destinoLat" DOUBLE PRECISION,
    "destinoLng" DOUBLE PRECISION,
    "tipoCarga" TEXT NOT NULL,
    "descripcionCarga" TEXT,
    "pesoKg" DECIMAL(10,2),
    "dimensiones" TEXT,
    "estado" "EstadoViaje" NOT NULL DEFAULT 'ASIGNADO',
    "trackingToken" TEXT NOT NULL,
    "fechaProgramada" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "odometroInicial" INTEGER,
    "odometroFinal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estado_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "estadoAnterior" "EstadoViaje",
    "estadoNuevo" "EstadoViaje" NOT NULL,
    "nota" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones_conductor" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "velocidad" DOUBLE PRECISION,
    "rumbo" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "capturadoEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ubicaciones_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "tipo" "TipoGasto" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "fotoTicketKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias_viaje" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "fotoKey" TEXT,
    "firmaKey" TEXT,
    "receptorNombre" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "capturadoEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartas_porte" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "estado" "EstadoCartaPorte" NOT NULL DEFAULT 'BORRADOR',
    "uuid" TEXT,
    "xmlKey" TEXT,
    "pdfKey" TEXT,
    "fechaTimbrado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartas_porte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "cartaPorteId" TEXT,
    "folio" SERIAL NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "conductores_usuario_key" ON "conductores"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "conductores_email_key" ON "conductores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_placas_key" ON "unidades"("placas");

-- CreateIndex
CREATE INDEX "documentos_unidad_unidadId_idx" ON "documentos_unidad"("unidadId");

-- CreateIndex
CREATE INDEX "documentos_unidad_fechaVencimiento_idx" ON "documentos_unidad"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "documentos_conductor_conductorId_idx" ON "documentos_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "documentos_conductor_fechaVencimiento_idx" ON "documentos_conductor"("fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "viajes_folio_key" ON "viajes"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "viajes_trackingToken_key" ON "viajes"("trackingToken");

-- CreateIndex
CREATE INDEX "viajes_clienteId_idx" ON "viajes"("clienteId");

-- CreateIndex
CREATE INDEX "viajes_unidadId_idx" ON "viajes"("unidadId");

-- CreateIndex
CREATE INDEX "viajes_conductorId_idx" ON "viajes"("conductorId");

-- CreateIndex
CREATE INDEX "viajes_estado_idx" ON "viajes"("estado");

-- CreateIndex
CREATE INDEX "historial_estado_viaje_viajeId_idx" ON "historial_estado_viaje"("viajeId");

-- CreateIndex
CREATE INDEX "ubicaciones_conductor_viajeId_idx" ON "ubicaciones_conductor"("viajeId");

-- CreateIndex
CREATE INDEX "ubicaciones_conductor_viajeId_capturadoEn_idx" ON "ubicaciones_conductor"("viajeId", "capturadoEn");

-- CreateIndex
CREATE INDEX "gastos_viaje_viajeId_idx" ON "gastos_viaje"("viajeId");

-- CreateIndex
CREATE INDEX "evidencias_viaje_viajeId_idx" ON "evidencias_viaje"("viajeId");

-- CreateIndex
CREATE UNIQUE INDEX "cartas_porte_viajeId_key" ON "cartas_porte"("viajeId");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_viajeId_key" ON "facturas"("viajeId");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_cartaPorteId_key" ON "facturas"("cartaPorteId");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_folio_key" ON "facturas"("folio");

-- AddForeignKey
ALTER TABLE "documentos_unidad" ADD CONSTRAINT "documentos_unidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_conductor" ADD CONSTRAINT "documentos_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_viaje" ADD CONSTRAINT "historial_estado_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones_conductor" ADD CONSTRAINT "ubicaciones_conductor_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones_conductor" ADD CONSTRAINT "ubicaciones_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_viaje" ADD CONSTRAINT "gastos_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_viaje" ADD CONSTRAINT "evidencias_viaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartas_porte" ADD CONSTRAINT "cartas_porte_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cartaPorteId_fkey" FOREIGN KEY ("cartaPorteId") REFERENCES "cartas_porte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
