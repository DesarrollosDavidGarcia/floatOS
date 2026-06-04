-- Extensiones requeridas por FlotaOS.
-- La imagen postgis/postgis ya incluye los binarios; aquí las habilitamos en la BD.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
