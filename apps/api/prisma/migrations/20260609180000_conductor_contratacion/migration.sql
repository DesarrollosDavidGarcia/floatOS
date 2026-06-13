-- Conductor: tipo de contratación (planta/freelance/terciarizado) + datos de la
-- empresa proveedora y vigencia del contrato temporal/externo.

ALTER TABLE "conductores" ADD COLUMN "tipoContratacion" TEXT DEFAULT 'PLANTA';
ALTER TABLE "conductores" ADD COLUMN "empresaProveedor" TEXT;
ALTER TABLE "conductores" ADD COLUMN "empresaProveedorRfc" TEXT;
ALTER TABLE "conductores" ADD COLUMN "proveedorContactoNombre" TEXT;
ALTER TABLE "conductores" ADD COLUMN "proveedorContactoTelefono" TEXT;
ALTER TABLE "conductores" ADD COLUMN "vigenciaDesde" TIMESTAMP(3);
ALTER TABLE "conductores" ADD COLUMN "vigenciaHasta" TIMESTAMP(3);
ALTER TABLE "conductores" ADD COLUMN "notasContratacion" TEXT;
