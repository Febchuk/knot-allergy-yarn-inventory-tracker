import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Use string literals that match the enum values in the database
const DyeStatus = {
  NOT_TO_BE_DYED: 'NOT_TO_BE_DYED' as const,
  TO_BE_DYED: 'TO_BE_DYED' as const,
  HAS_BEEN_DYED: 'HAS_BEEN_DYED' as const
};

async function main() {
  console.log('Starting seed...');

  // Create a test user if not exists
  const testUserEmail = 'test@example.com';
  
  const existingUser = await prisma.user.findUnique({
    where: { email: testUserEmail }
  });

  let userId: string;
  
  if (!existingUser) {
    console.log('Creating test user...');
    const hashedPassword = await hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Test User',
        password: hashedPassword,
      }
    });
    
    userId = user.id;
    console.log(`Created test user with ID: ${userId}`);
  } else {
    userId = existingUser.id;
    console.log(`Using existing user with ID: ${userId}`);
  }

  // Create organization types if not exist
  console.log('Creating yarn organization types...');
  const organizationTypes = [
    { name: "SKEIN", isSystem: true },
    { name: "BALL", isSystem: true },
    { name: "CAKE", isSystem: true },
    { name: "HANK", isSystem: true },
    { name: "CONE", isSystem: true },
  ];

  const createdOrganizationTypes = await Promise.all(
    organizationTypes.map(type => 
      prisma.yarnOrganizationType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      })
    )
  );

  console.log(`Created/Updated ${createdOrganizationTypes.length} organization types`);

  // Store organization type IDs for reference
  const orgTypeIds = {
    SKEIN: createdOrganizationTypes.find(t => t.name === "SKEIN")?.id,
    BALL: createdOrganizationTypes.find(t => t.name === "BALL")?.id,
    CAKE: createdOrganizationTypes.find(t => t.name === "CAKE")?.id,
    HANK: createdOrganizationTypes.find(t => t.name === "HANK")?.id,
    CONE: createdOrganizationTypes.find(t => t.name === "CONE")?.id,
  };

  // Sample yarn data with new schema format
  const yarns = [
    {
      brand: 'Malabrigo',
      productLine: 'Rios',
      prevColor: null,
      currColor: 'Teal Feather',
      nextColor: null,
      dyeStatus: DyeStatus.NOT_TO_BE_DYED,
      materials: '100% Superwash Merino Wool',
      weight: 4, // Worsted
      yardsPerOz: '210/3.5', // Format: yards/oz
      totalWeight: 3.5,
      totalYards: 210,
      userId,
      organization: [
        { typeId: orgTypeIds.SKEIN!, quantity: 1 }
      ],
      tags: ['wool', 'worsted', 'superwash']
    },
    {
      brand: 'Lion Brand',
      productLine: 'Wool-Ease',
      prevColor: 'Fisherman',
      currColor: 'Rose Pink', 
      nextColor: 'Navy Blue',
      dyeStatus: DyeStatus.TO_BE_DYED,
      materials: '80% Acrylic, 20% Wool',
      weight: 4, // Worsted
      yardsPerOz: '197/3', // Format: yards/oz
      totalWeight: 9,
      totalYards: 591,
      userId,
      organization: [
        { typeId: orgTypeIds.SKEIN!, quantity: 3 }
      ],
      tags: ['acrylic', 'wool', 'worsted']
    },
    {
      brand: 'Cascade',
      productLine: 'Heritage Sock',
      prevColor: null,
      currColor: 'Forest Green',
      nextColor: null,
      dyeStatus: DyeStatus.HAS_BEEN_DYED,
      materials: '75% Merino Superwash, 25% Nylon',
      weight: 1, // Fingering
      yardsPerOz: '437/3.5', // Format: yards/oz
      totalWeight: 3.5,
      totalYards: 437,
      userId,
      organization: [
        { typeId: orgTypeIds.BALL!, quantity: 1 }
      ],
      tags: ['sock', 'fingering', 'wool', 'nylon']
    }
  ];

  console.log('Creating yarn samples...');
  
  // Clear existing yarns for this user to avoid duplicates
  await prisma.yarn.deleteMany({
    where: { userId }
  });

  // Create each yarn and its related data
  const createdYarns = [];
  
  for (const yarnData of yarns) {
    const { organization, tags, ...yarnDetails } = yarnData;
    
    // Create the yarn
    const yarn = await prisma.yarn.create({
      data: {
        ...yarnDetails,
        tags: {
          create: tags.map(tag => ({ name: tag }))
        }
      }
    });

    // Create the organization entries
    if (organization && organization.length > 0) {
      await prisma.yarnOrganization.createMany({
        data: organization.map(org => ({
          typeId: org.typeId,
          quantity: org.quantity,
          yarnId: yarn.id
        }))
      });
    }

    createdYarns.push(yarn);
    console.log(`Created yarn: ${yarn.brand} ${yarn.productLine} (${yarn.id})`);
  }

  // Sample projects data
  console.log('Creating project samples...');
  
  // Clear existing projects for this user to avoid duplicates
  await prisma.project.deleteMany({
    where: { userId }
  });
  
  const projects = [
    {
      name: 'Cozy Winter Sweater',
      description: 'A warm cable-knit sweater for the winter season',
      status: 'in_progress',
      userId,
      yarns: [createdYarns[0].id, createdYarns[1].id] // Associate with Malabrigo and Lion Brand
    },
    {
      name: 'Colorful Socks',
      description: 'Fun patterned socks with color transitions',
      status: 'planned',
      userId,
      yarns: [createdYarns[2].id] // Associate with Cascade Heritage Sock
    },
    {
      name: 'Summer Shawl',
      description: 'Lightweight shawl for cool summer evenings',
      status: 'completed',
      userId,
      yarns: [createdYarns[0].id] // Associate with Malabrigo
    }
  ];
  
  // Create each project and its related data
  for (const projectData of projects) {
    const { yarns, ...projectDetails } = projectData;
    
    // Create the project
    const project = await prisma.project.create({
      data: {
        ...projectDetails,
        yarns: {
          connect: yarns.map(id => ({ id }))
        }
      }
    });
    
    console.log(`Created project: ${project.name} (${project.id})`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 