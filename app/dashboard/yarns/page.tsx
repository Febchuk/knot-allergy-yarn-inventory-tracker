import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClient } from "@prisma/client";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    const yarns = await prisma.yarn.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        photos: true,
        tags: true,
        projects: true,
        organization: {
          include: {
            type: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Yarn Inventory</h2>
          <Link href="/dashboard/yarns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Yarn
            </Button>
          </Link>
        </div>
        <DataTable data={yarns} columns={columns} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching yarns:", error);
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Yarn Data</h2>
        <p className="mt-2">There was a problem loading your yarn inventory.</p>
        <pre className="mt-4 p-4 bg-red-50 text-red-800 rounded overflow-auto max-h-96">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
} 