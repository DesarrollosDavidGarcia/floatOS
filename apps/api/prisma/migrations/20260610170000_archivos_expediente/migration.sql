-- Evidencias del expediente: N archivos (PDF o imagen) por registro de las
-- secciones médico / certificaciones / capacitaciones / control de confianza /
-- incidencias / evaluaciones. Tabla genérica keyed por (seccion, registroId)
-- con FK a conductor para cascade al borrar el conductor.

CREATE TYPE "SeccionExpediente" AS ENUM (
    'EXAMEN_MEDICO',
    'CERTIFICACION',
    'CAPACITACION',
    'CONTROL_CONFIANZA',
    'INCIDENCIA',
    'EVALUACION'
);

CREATE TABLE "archivos_expediente" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "seccion" "SeccionExpediente" NOT NULL,
    "registroId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_expediente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "archivos_expediente_conductorId_idx" ON "archivos_expediente"("conductorId");

CREATE INDEX "archivos_expediente_seccion_registroId_idx" ON "archivos_expediente"("seccion", "registroId");

ALTER TABLE "archivos_expediente" ADD CONSTRAINT "archivos_expediente_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "conductores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
