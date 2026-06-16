-- AlterEnum: nuevo estado VARADO (pausa recuperable por incidencia), antes de ENTREGADO.
ALTER TYPE "EstadoViaje" ADD VALUE 'VARADO' BEFORE 'ENTREGADO';

-- AlterTable: estado al que regresar al reanudar tras VARADO.
ALTER TABLE "viajes" ADD COLUMN "estadoPrevioVarado" "EstadoViaje";
