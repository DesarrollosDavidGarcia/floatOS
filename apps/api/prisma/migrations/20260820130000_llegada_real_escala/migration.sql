-- Hora real de llegada a la escala, separada del sello del aviso.
--
-- `llegadaNotificadaEn` marca CUÁNDO SE AVISÓ (se sella con now() al procesar el
-- lote), así que no sirve para medir la estancia: si el conductor sincroniza sin
-- cobertura, el aviso se fecha horas después de la llegada real y la demora sale
-- inflada o incluso negativa contra `salidaRegistradaEn`, que sí usa la hora del
-- ping. `llegadaEn` guarda el capturadoEn del primer ping dentro del radio.
--
-- Aplicada con `migrate deploy` (migrate dev rompe con PostGIS; ver CLAUDE.md).

-- AlterTable
ALTER TABLE "escalas_viaje" ADD COLUMN "llegadaEn" TIMESTAMP(3);

-- Backfill: en las escalas ya notificadas el único dato existente es el sello
-- del aviso. Es una aproximación —se adelanta en los lotes offline— pero deja la
-- estancia calculable en el histórico en vez de dejarla en NULL.
UPDATE "escalas_viaje"
SET "llegadaEn" = "llegadaNotificadaEn"
WHERE "llegadaNotificadaEn" IS NOT NULL
  AND "llegadaEn" IS NULL;
