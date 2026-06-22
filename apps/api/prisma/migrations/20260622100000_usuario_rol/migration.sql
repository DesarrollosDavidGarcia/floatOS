-- Rol del usuario del panel: ADMIN (acceso total) o MONITORISTA (operación de viajes).
-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'MONITORISTA');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN';
