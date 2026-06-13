-- Plan multi-día por viaje (horas de conducción/día, descanso, tiempo por escala,
-- hora de inicio) que asigna el monitorista; alimenta la llegada estimada.
ALTER TABLE "viajes" ADD COLUMN IF NOT EXISTS "planRuta" JSONB;
