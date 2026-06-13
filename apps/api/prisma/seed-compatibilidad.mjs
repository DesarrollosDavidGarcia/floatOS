// Seed idempotente de reglas de compatibilidad carga↔unidad para el motor.
// Semántica allow-list: un tipo de carga listado aquí SOLO se permite en los
// tipos de unidad indicados; los tipos de carga NO listados (GENERAL, PALETIZADA,
// OTRO, ...) se permiten en cualquier unidad.
//
//   node prisma/seed-compatibilidad.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** tipoCarga -> tipos de unidad permitidos */
const REGLAS = {
  LIQUIDA: ['PIPA'],
  // Refrigerada/congelada SOLO en caja refrigerada (reefer).
  REFRIGERADA: ['CAJA_REFRIGERADA'],
  CONGELADA: ['CAJA_REFRIGERADA'],
  GRANEL: ['TRACTOCAMION', 'TORTON', 'RABON', 'CAMION', 'PLATAFORMA'],
  PELIGROSA: ['TRACTOCAMION', 'CAMION', 'PIPA', 'CAJA_SECA'],
  SOBREDIMENSIONADA: ['PLATAFORMA', 'TRACTOCAMION'],
};

async function main() {
  let total = 0;
  for (const [tipoCarga, unidades] of Object.entries(REGLAS)) {
    for (const tipoUnidad of unidades) {
      await prisma.compatibilidadCargaUnidad.upsert({
        where: { tipoCarga_tipoUnidad: { tipoCarga, tipoUnidad } },
        update: { permitido: true },
        create: { tipoCarga, tipoUnidad, permitido: true },
      });
      total++;
    }
  }
  console.log(`✔ Reglas de compatibilidad sembradas: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
