-- Dos tipos de servicio: carga (existente) y personal (pasajeros).
-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('CARGA', 'PERSONAL');

-- AlterTable
ALTER TABLE "unidades" ADD COLUMN     "capacidadPasajeros" INTEGER;

-- AlterTable
ALTER TABLE "viajes" ADD COLUMN     "numPasajeros" INTEGER,
ADD COLUMN     "tipoServicio" "TipoServicio" NOT NULL DEFAULT 'CARGA',
ALTER COLUMN "tipoCarga" DROP NOT NULL;

