-- Marca de tiempo de la primera alerta de geocerca por escala (dedup entre lotes).
ALTER TABLE "escalas_viaje" ADD COLUMN "llegadaNotificadaEn" TIMESTAMP(3);
