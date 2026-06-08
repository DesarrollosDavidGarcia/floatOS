-- Geometría (polilínea) de la ruta por carretera: en la caché y como snapshot del viaje.
ALTER TABLE "ruta_cache" ADD COLUMN "geometria" JSONB;
ALTER TABLE "viajes" ADD COLUMN "rutaGeometria" JSONB;
