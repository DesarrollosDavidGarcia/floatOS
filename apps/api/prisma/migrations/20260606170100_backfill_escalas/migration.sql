-- Backfill: convierte cada viaje existente (origen/destino) en 2 escalas + 1 carga.
-- Idempotente: ids derivados del viaje (esc0_/esc1_/car0_) + guardas NOT EXISTS.

-- Escala origen (orden 0, RECOGER)
INSERT INTO "escalas_viaje" ("id", "viajeId", "orden", "accion", "direccion", "lat", "lng", "createdAt", "updatedAt")
SELECT 'esc0_' || v."id", v."id", 0, 'RECOGER', v."origenDireccion", v."origenLat", v."origenLng", now(), now()
FROM "viajes" v
WHERE NOT EXISTS (
  SELECT 1 FROM "escalas_viaje" e WHERE e."viajeId" = v."id" AND e."orden" = 0
);

-- Escala destino (orden 1, ENTREGAR)
INSERT INTO "escalas_viaje" ("id", "viajeId", "orden", "accion", "direccion", "lat", "lng", "createdAt", "updatedAt")
SELECT 'esc1_' || v."id", v."id", 1, 'ENTREGAR', v."destinoDireccion", v."destinoLat", v."destinoLng", now(), now()
FROM "viajes" v
WHERE NOT EXISTS (
  SELECT 1 FROM "escalas_viaje" e WHERE e."viajeId" = v."id" AND e."orden" = 1
);

-- Carga inicial en la escala de origen (CARGA). tipoCarga vacío -> GENERAL; peso NULL -> 0.
INSERT INTO "cargas_escala" ("id", "escalaId", "sentido", "tipoCarga", "descripcion", "pesoKg", "cantidad", "createdAt")
SELECT 'car0_' || v."id", 'esc0_' || v."id", 'CARGA',
       COALESCE(NULLIF(v."tipoCarga", ''), 'GENERAL'),
       v."descripcionCarga",
       COALESCE(v."pesoKg", 0), 1, now()
FROM "viajes" v
WHERE EXISTS (SELECT 1 FROM "escalas_viaje" e WHERE e."id" = 'esc0_' || v."id")
  AND NOT EXISTS (SELECT 1 FROM "cargas_escala" c WHERE c."id" = 'car0_' || v."id");
