import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) return;

  const user = await prisma.user.create({
    data: {
      name: 'Sample User',
    },
  });

  await prisma.workspace.create({
    data: {
      name: 'Sample Workspace',
      ownerId: user.id,
    },
  });
}

main()
  .catch((error) => {
    console.error('Seed error', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
