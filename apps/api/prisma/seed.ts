import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed inicial de una instancia: crea el usuario admin.
 * Variables: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE (con valores por defecto).
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@flotaos.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
  const nombre = process.env.ADMIN_NOMBRE ?? 'Administrador';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, nombre },
  });

  console.log(`✔ Usuario admin listo: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
