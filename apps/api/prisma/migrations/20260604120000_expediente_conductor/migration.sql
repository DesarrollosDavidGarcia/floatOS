-- CreateEnum
CREATE TYPE "CategoriaLicencia" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateEnum
CREATE TYPE "TipoExamenMedico" AS ENUM ('APTITUD_PSICOFISICA', 'ANTIDOPING', 'EXAMEN_GENERAL', 'VISTA', 'AUDITIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "ResultadoExamen" AS ENUM ('APTO', 'NO_APTO', 'CONDICIONADO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "TipoCertificacion" AS ENUM ('MATERIALES_PELIGROSOS', 'RESIDUOS_PELIGROSOS', 'MANEJO_DEFENSIVO', 'PRIMEROS_AUXILIOS', 'CAAT', 'MERCANCIAS_PELIGROSAS_SCT', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('ACCIDENTE', 'INFRACCION', 'SANCION', 'FALTA', 'QUEJA', 'RECONOCIMIENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "GravedadIncidencia" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoEventoLaboral" AS ENUM ('INGRESO', 'ASCENSO', 'CAMBIO_PUESTO', 'CAMBIO_SALARIO', 'AMONESTACION', 'RECONOCIMIENTO', 'BAJA', 'OTRO');

-- CreateEnum
CREATE TYPE "NivelAptitud" AS ENUM ('PRINCIPIANTE', 'INTERMEDIO', 'EXPERTO');

-- CreateEnum
CREATE TYPE "TipoUnidadManejo" AS ENUM ('TRACTOCAMION', 'TORTON', 'RABON', 'THORTON', 'CAMION_3_5', 'CAMIONETA', 'CAJA_SECA', 'CAJA_REFRIGERADA', 'PLATAFORMA', 'TOLVA', 'PIPA', 'FULL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoControlConfianza" AS ENUM ('EXAMEN_CONFIANZA', 'ANTECEDENTES_NO_PENALES', 'ESTUDIO_SOCIOECONOMICO', 'POLIGRAFO', 'TOXICOLOGICO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoAusencia" AS ENUM ('INCAPACIDAD_IMSS', 'VACACIONES', 'PERMISO_CON_GOCE', 'PERMISO_SIN_GOCE', 'FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'OTRO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'INE';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'CURP';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'RFC';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'COMPROBANTE_DOMICILIO';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'CONSTANCIA_SITUACION_FISCAL';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'CONTRATO';
ALTER TYPE "TipoDocumentoConductor" ADD VALUE 'ALTA_IMSS';

-- AlterTable
ALTER TABLE "conductores" ADD COLUMN     "categoriaLicencia" "CategoriaLicencia",
ADD COLUMN     "curp" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "emergenciaNombre" TEXT,
ADD COLUMN     "emergenciaRelacion" TEXT,
ADD COLUMN     "emergenciaTelefono" TEXT,
ADD COLUMN     "fechaIngreso" TIMESTAMP(3),
ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "nss" TEXT,
ADD COLUMN     "numeroEmpleado" TEXT,
ADD COLUMN     "puesto" TEXT,
ADD COLUMN     "rfc" TEXT,
ADD COLUMN     "tipoSangre" TEXT;

-- CreateTable
CREATE TABLE "examenes_medicos_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoExamenMedico" NOT NULL,
    "resultado" "ResultadoExamen" NOT NULL DEFAULT 'PENDIENTE',
    "fechaExamen" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "institucion" TEXT,
    "medico" TEXT,
    "observaciones" TEXT,
    "archivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examenes_medicos_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificaciones_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoCertificacion" NOT NULL,
    "nombre" TEXT NOT NULL,
    "emisor" TEXT,
    "folio" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "archivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificaciones_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacitaciones_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "instructor" TEXT,
    "institucion" TEXT,
    "horas" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "aprobado" BOOLEAN,
    "calificacion" DECIMAL(5,2),
    "constanciaKey" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacitaciones_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "viajeId" TEXT,
    "tipo" "TipoIncidencia" NOT NULL,
    "gravedad" "GravedadIncidencia" NOT NULL DEFAULT 'MEDIA',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT,
    "costoEstimado" DECIMAL(12,2),
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "evidenciaKey" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencias_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_laborales_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoEventoLaboral" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "puestoNuevo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_laborales_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aptitudes_unidad_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipoUnidad" "TipoUnidadManejo" NOT NULL,
    "nivel" "NivelAptitud" NOT NULL DEFAULT 'INTERMEDIO',
    "aniosExperiencia" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aptitudes_unidad_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_confianza_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoControlConfianza" NOT NULL,
    "resultado" "ResultadoExamen" NOT NULL DEFAULT 'PENDIENTE',
    "institucion" TEXT,
    "folio" TEXT,
    "fechaEvaluacion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "archivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controles_confianza_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones_desempeno_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "puntuacionGeneral" DECIMAL(5,2),
    "puntualidad" DECIMAL(5,2),
    "consumoCombustible" DECIMAL(6,2),
    "cumplimientoRutas" DECIMAL(5,2),
    "incidenciasPeriodo" INTEGER,
    "viajesCompletados" INTEGER,
    "comentarios" TEXT,
    "evaluadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluaciones_desempeno_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ausencias_conductor" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "tipo" "TipoAusencia" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "dias" INTEGER,
    "motivo" TEXT,
    "folioIncapacidad" TEXT,
    "autorizadoPor" TEXT,
    "documentoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ausencias_conductor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "examenes_medicos_conductor_conductorId_idx" ON "examenes_medicos_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "examenes_medicos_conductor_fechaVencimiento_idx" ON "examenes_medicos_conductor"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "certificaciones_conductor_conductorId_idx" ON "certificaciones_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "certificaciones_conductor_fechaVencimiento_idx" ON "certificaciones_conductor"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "capacitaciones_conductor_conductorId_idx" ON "capacitaciones_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "incidencias_conductor_conductorId_idx" ON "incidencias_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "incidencias_conductor_viajeId_idx" ON "incidencias_conductor"("viajeId");

-- CreateIndex
CREATE INDEX "eventos_laborales_conductor_conductorId_idx" ON "eventos_laborales_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "aptitudes_unidad_conductor_conductorId_idx" ON "aptitudes_unidad_conductor"("conductorId");

-- CreateIndex
CREATE UNIQUE INDEX "aptitudes_unidad_conductor_conductorId_tipoUnidad_key" ON "aptitudes_unidad_conductor"("conductorId", "tipoUnidad");

-- CreateIndex
CREATE INDEX "controles_confianza_conductor_conductorId_idx" ON "controles_confianza_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "controles_confianza_conductor_fechaVencimiento_idx" ON "controles_confianza_conductor"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "evaluaciones_desempeno_conductor_conductorId_idx" ON "evaluaciones_desempeno_conductor"("conductorId");

-- CreateIndex
CREATE INDEX "ausencias_conductor_conductorId_idx" ON "ausencias_conductor"("conductorId");

-- CreateIndex
CREATE UNIQUE INDEX "conductores_curp_key" ON "conductores"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "conductores_numeroEmpleado_key" ON "conductores"("numeroEmpleado");

-- AddForeignKey
ALTER TABLE "examenes_medicos_conductor" ADD CONSTRAINT "examenes_medicos_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificaciones_conductor" ADD CONSTRAINT "certificaciones_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitaciones_conductor" ADD CONSTRAINT "capacitaciones_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_conductor" ADD CONSTRAINT "incidencias_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_conductor" ADD CONSTRAINT "incidencias_conductor_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "viajes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_laborales_conductor" ADD CONSTRAINT "eventos_laborales_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aptitudes_unidad_conductor" ADD CONSTRAINT "aptitudes_unidad_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_confianza_conductor" ADD CONSTRAINT "controles_confianza_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_desempeno_conductor" ADD CONSTRAINT "evaluaciones_desempeno_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias_conductor" ADD CONSTRAINT "ausencias_conductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

