import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      photos: true,
      tags: true,
      projects: true
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
} 