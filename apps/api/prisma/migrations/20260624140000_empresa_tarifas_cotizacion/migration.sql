-- Tarifas por defecto para la cotización del bot (n8n), guardadas como JSON
-- (forma de ParamsCotizacion). Null = el bot usa los valores por defecto del código.
ALTER TABLE "empresa" ADD COLUMN "tarifasCotizacion" JSONB;
