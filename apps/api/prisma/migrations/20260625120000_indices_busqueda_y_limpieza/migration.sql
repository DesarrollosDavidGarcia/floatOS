-- Índices de la auditoría 2026-06-25 (performance + limpieza).
--
-- 1) Búsqueda trigram (pg_trgm) para los listados que hacen ILIKE '%x%':
--    - clientes.rfc            (ListarClientesUseCase)
--    - conductores.nombre/apellidos/usuario/email (ListarConductoresUseCase)
--    Un patrón '%x%' no usa índices btree → seq scan. Los GIN trigram sí aceleran.
--    Se gestionan por SQL crudo (no como @@index): Prisma generaría un btree inútil.
-- 2) escalas_viaje.llegadaNotificadaEn: la campana del panel filtra/ordena por esta
--    columna globalmente; sin índice hacía scan+sort de toda la tabla. (gestionado
--    por schema → @@index, btree estándar).
-- 3) Se elimina el índice redundante ubicaciones_conductor_viajeId_idx: el compuesto
--    (viajeId, capturadoEn) ya lo cubre. Abarata las escrituras de la tabla GPS.

-- pg_trgm ya fue creada por 20260624130000; IF NOT EXISTS por seguridad.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- (1) Trigram — clientes.rfc
CREATE INDEX IF NOT EXISTS "clientes_rfc_trgm_idx"
  ON "clientes" USING gin ("rfc" gin_trgm_ops);

-- (1) Trigram — conductores
CREATE INDEX IF NOT EXISTS "conductores_nombre_trgm_idx"
  ON "conductores" USING gin ("nombre" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "conductores_apellidos_trgm_idx"
  ON "conductores" USING gin ("apellidos" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "conductores_usuario_trgm_idx"
  ON "conductores" USING gin ("usuario" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "conductores_email_trgm_idx"
  ON "conductores" USING gin ("email" gin_trgm_ops);

-- (2) Btree — escalas_viaje.llegadaNotificadaEn (gestionado por @@index del schema)
CREATE INDEX IF NOT EXISTS "escalas_viaje_llegadaNotificadaEn_idx"
  ON "escalas_viaje" ("llegadaNotificadaEn");

-- (3) Drop del índice redundante en la tabla de GPS
DROP INDEX IF EXISTS "ubicaciones_conductor_viajeId_idx";
