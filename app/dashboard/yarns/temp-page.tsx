import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClient } from "@prisma/client";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

export default async function TempYarnsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Not logged in</div>;
  }

  try {
    // Try to fetch yarn data with organizations
    const yarns = await prisma.yarn.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        brand: true,
        productLine: true,
        currColor: true,
        organization: {
          select: {
            id: true,
            quantity: true,
            type: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 5,
    });

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Yarns Page</h1>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(yarns, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="bg-red-100 p-4 rounded text-red-600">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
} 