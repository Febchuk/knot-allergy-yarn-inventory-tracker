import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default yarn organization types...');

  // Default organization types
  const defaultTypes = [
    { name: "SKEIN", isSystem: true },
    { name: "BALL", isSystem: true },
    { name: "CAKE", isSystem: true },
    { name: "HANK", isSystem: true },
  ];

  // Create all default types in a single transaction
  const createdTypes = await prisma.$transaction(
    defaultTypes.map(type => 
      prisma.yarnOrganizationType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      })
    )
  );

  console.log(`Created ${createdTypes.length} organization types`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 