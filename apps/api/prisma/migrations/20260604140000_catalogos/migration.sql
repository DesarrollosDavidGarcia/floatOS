-- Catálogos: convierte las columnas de tipo/categoría de enum a TEXT preservando
-- los datos existentes (ALTER ... TYPE TEXT USING), en vez del DROP/ADD que
-- generaría Prisma. Los enums quedan como tipos legados sin uso en el schema.

-- documentos_unidad.tipo
ALTER TABLE "documentos_unidad" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- documentos_conductor.tipo
ALTER TABLE "documentos_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- conductores.categoriaLicencia
ALTER TABLE "conductores" ALTER COLUMN "categoriaLicencia" TYPE TEXT USING "categoriaLicencia"::text;

-- examenes_medicos_conductor.tipo + resultado(default)
ALTER TABLE "examenes_medicos_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
ALTER TABLE "examenes_medicos_conductor" ALTER COLUMN "resultado" DROP DEFAULT;
ALTER TABLE "examenes_medicos_conductor" ALTER COLUMN "resultado" TYPE TEXT USING "resultado"::text;
ALTER TABLE "examenes_medicos_conductor" ALTER COLUMN "resultado" SET DEFAULT 'PENDIENTE';

-- certificaciones_conductor.tipo
ALTER TABLE "certificaciones_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- incidencias_conductor.tipo + gravedad(default)
ALTER TABLE "incidencias_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
ALTER TABLE "incidencias_conductor" ALTER COLUMN "gravedad" DROP DEFAULT;
ALTER TABLE "incidencias_conductor" ALTER COLUMN "gravedad" TYPE TEXT USING "gravedad"::text;
ALTER TABLE "incidencias_conductor" ALTER COLUMN "gravedad" SET DEFAULT 'MEDIA';

-- eventos_laborales_conductor.tipo
ALTER TABLE "eventos_laborales_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- aptitudes_unidad_conductor.tipoUnidad + nivel(default)
ALTER TABLE "aptitudes_unidad_conductor" ALTER COLUMN "tipoUnidad" TYPE TEXT USING "tipoUnidad"::text;
ALTER TABLE "aptitudes_unidad_conductor" ALTER COLUMN "nivel" DROP DEFAULT;
ALTER TABLE "aptitudes_unidad_conductor" ALTER COLUMN "nivel" TYPE TEXT USING "nivel"::text;
ALTER TABLE "aptitudes_unidad_conductor" ALTER COLUMN "nivel" SET DEFAULT 'INTERMEDIO';

-- controles_confianza_conductor.tipo + resultado(default)
ALTER TABLE "controles_confianza_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
ALTER TABLE "controles_confianza_conductor" ALTER COLUMN "resultado" DROP DEFAULT;
ALTER TABLE "controles_confianza_conductor" ALTER COLUMN "resultado" TYPE TEXT USING "resultado"::text;
ALTER TABLE "controles_confianza_conductor" ALTER COLUMN "resultado" SET DEFAULT 'PENDIENTE';

-- ausencias_conductor.tipo
ALTER TABLE "ausencias_conductor" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- gastos_viaje.tipo
ALTER TABLE "gastos_viaje" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- CreateTable: catálogo genérico
CREATE TABLE "catalogo_items" (
    "id" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalogo_items_grupo_idx" ON "catalogo_items"("grupo");
CREATE UNIQUE INDEX "catalogo_items_grupo_codigo_key" ON "catalogo_items"("grupo", "codigo");
