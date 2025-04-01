import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight } from "lucide-react";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

const statusMap = {
  "in_progress": "In Progress",
  "completed": "Completed",
  "planned": "Planned",
  "frogged": "Frogged"
} as const;

// Add type definition
type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  yarns: Array<{
    id: string;
    brand: string;
    productLine: string;
  }>;
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        yarns: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="mb-4 text-center text-muted-foreground">
                You don&apos;t have any projects yet.
              </p>
              <Link href="/dashboard/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: Project) => (
              <Link 
                key={project.id} 
                href={`/dashboard/projects/${project.id}`}
                className="block transition-transform hover:scale-105"
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="truncate">{project.name}</CardTitle>
                      <Badge>
                        {statusMap[project.status as keyof typeof statusMap] || project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        {project.yarns.length > 0 ? (
                          <span className="text-muted-foreground">
                            {project.yarns.length} {project.yarns.length === 1 ? 'yarn' : 'yarns'} used
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No yarns assigned</span>
                        )}
                      </div>
                      <div className="flex items-center text-primary">
                        <span className="mr-1">View</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error fetching projects:", error);
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Projects</h2>
        <p className="mt-2">There was a problem loading your projects.</p>
        <pre className="mt-4 p-4 bg-red-50 text-red-800 rounded overflow-auto max-h-96">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
} 