import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, GitFork } from "lucide-react";
import { PrismaClient } from "@prisma/client";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    const [yarnCount, projectCount] = await Promise.all([
      prisma.yarn.count({
        where: {
          userId: session.user.id,
        },
      }),
      prisma.project.count({
        where: {
          userId: session.user.id,
        },
      }),
    ]);

    return (
      <div className="space-y-8 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Yarn</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yarnCount}</div>
              <p className="text-xs text-muted-foreground">
                Yarns in your inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <GitFork className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectCount}</div>
              <p className="text-xs text-muted-foreground">
                Projects in progress
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your recent activity will appear here
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Project status overview will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading dashboard:", error);
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Dashboard</h2>
        <p className="mt-2">There was a problem loading your dashboard data.</p>
      </div>
    );
  }
} 