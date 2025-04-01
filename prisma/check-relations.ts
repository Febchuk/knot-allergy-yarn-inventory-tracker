
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Prisma relations...');

  try {
    // Check Yarn model available fields
    const yarn = await prisma.yarn.findFirst({
      include: {
        organization: {
          include: {
            type: true
          }
        }
      }
    });

    console.log('Successfully queried yarn with organization relation:');
    console.log(JSON.stringify({
      id: yarn?.id,
      brand: yarn?.brand,
      productLine: yarn?.productLine,
      organizationCount: yarn?.organization?.length
    }, null, 2));

    // Check YarnOrganizationType model
    const organizationTypes = await prisma.yarnOrganizationType.findMany();
    console.log(`Found ${organizationTypes.length} organization types`);

  } catch (error) {
    console.error('Error querying data:');
    console.error(error);
  }
}

main()
  .catch(e => {
    console.error('Script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 