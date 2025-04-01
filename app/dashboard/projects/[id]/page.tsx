import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Calendar, Pencil, Package } from "lucide-react";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

const statusMap = {
  "in_progress": "In Progress",
  "completed": "Completed",
  "planned": "Planned",
  "frogged": "Frogged"
} as const;

// Define types for the data we'll be working with
type ProjectType = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  yarns: Array<{
    id: string;
    brand: string;
    productLine: string;
    currColor: string | null;
    weight: number;
    totalWeight: number;
    totalYards: number;
  }>;
};

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    // Extract the ID parameter first
    const id = params.id;

    const project = await prisma.project.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        yarns: true,
      },
    }) as ProjectType | null;

    if (!project) {
      return notFound();
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/projects">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            <Badge>
              {statusMap[project.status as keyof typeof statusMap] || project.status}
            </Badge>
          </div>
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-lg">{project.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className="mt-1">
                  {statusMap[project.status as keyof typeof statusMap] || project.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created On</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yarns Used</CardTitle>
            <CardDescription>
              Yarns associated with this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.yarns.length > 0 ? (
              <div className="space-y-4">
                {project.yarns.map((yarn) => (
                  <div key={yarn.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{yarn.brand} {yarn.productLine}</p>
                      {yarn.currColor && (
                        <p className="text-sm text-muted-foreground">Color: {yarn.currColor}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Weight: {yarn.weight} | {yarn.totalWeight} oz | {yarn.totalYards} yards
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/dashboard/yarns/${yarn.id}`}>
                        <Button variant="outline" size="sm">
                          <Package className="mr-2 h-4 w-4" />
                          View Yarn
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No yarns are associated with this project yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching project:", error);
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Project</h2>
        <p className="mt-2">There was a problem loading the project details.</p>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }
} 