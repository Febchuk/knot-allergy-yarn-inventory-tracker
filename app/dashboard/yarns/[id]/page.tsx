import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Tag, Calendar, Pencil, Box } from "lucide-react";

// Create a fresh Prisma client instance
const prisma = new PrismaClient();

const dyeStatusMap = {
  NOT_TO_BE_DYED: "Not to be dyed",
  TO_BE_DYED: "To be dyed",
  HAS_BEEN_DYED: "Has been dyed",
} as const;

// Define types for the data we'll be working with
type YarnType = {
  id: string;
  brand: string;
  productLine: string;
  prevColor: string | null;
  currColor: string | null;
  nextColor: string | null;
  dyeStatus: string;
  materials: string;
  weight: number;
  yardsPerOz: string;
  totalWeight: number;
  totalYards: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  photos: Array<{
    id: string;
    url: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
  }>;
  organization: Array<{
    id: string;
    quantity: number;
    type: {
      id: string;
      name: string;
    }
  }>;
};

export default async function YarnDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    // Extract the ID parameter first
    const id = params.id;

    const yarn = await prisma.yarn.findUnique({
      where: {
        id: id,
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
    }) as YarnType | null;

    if (!yarn) {
      return notFound();
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/yarns">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {yarn.brand} {yarn.productLine}
            </h1>
            {yarn.currColor && (
              <Badge variant="outline">{yarn.currColor}</Badge>
            )}
          </div>
          <Link href={`/dashboard/yarns/${yarn.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Yarn
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Yarn Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brand</p>
                  <p className="text-lg font-medium">{yarn.brand}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Product Line</p>
                  <p className="text-lg font-medium">{yarn.productLine}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Materials</p>
                <p className="text-lg font-medium">{yarn.materials}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weight</p>
                  <p className="text-lg font-medium">{yarn.weight}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Weight</p>
                  <p className="text-lg font-medium">{yarn.totalWeight} oz</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Yards</p>
                  <p className="text-lg font-medium">{yarn.totalYards}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Yards/Oz</p>
                <p className="text-lg font-medium">{yarn.yardsPerOz}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Organization</p>
                {yarn.organization.length > 0 ? (
                  <div className="space-y-2">
                    {yarn.organization.map((org) => (
                      <div key={org.id} className="flex items-center space-x-2">
                        <Box className="h-4 w-4 text-muted-foreground" />
                        <p>
                          {org.quantity} {org.type.name}
                          {org.quantity > 1 ? "s" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No organization information</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colors & Dyeing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Previous Color</p>
                  <p className="text-lg font-medium">{yarn.prevColor || "None"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Color</p>
                  <p className="text-lg font-medium">{yarn.currColor || "None"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Color</p>
                  <p className="text-lg font-medium">{yarn.nextColor || "None"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Dye Status</p>
                <Badge 
                  className="mt-1"
                >
                  {dyeStatusMap[yarn.dyeStatus as keyof typeof dyeStatusMap] || yarn.dyeStatus}
                </Badge>
              </div>

              {yarn.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {yarn.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">Added On</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(yarn.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  {new Date(yarn.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Associated Projects</CardTitle>
            <CardDescription>
              Projects that use this yarn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {yarn.projects.length > 0 ? (
              <div className="space-y-4">
                {yarn.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline"
                      >
                        {project.status === "in_progress" ? "In Progress" : 
                         project.status === "completed" ? "Completed" : 
                         project.status === "planned" ? "Planned" : project.status}
                      </Badge>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">This yarn is not used in any projects yet.</p>
            )}
          </CardContent>
        </Card>

        {yarn.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {yarn.photos.map((photo) => (
                  <div key={photo.id} className="overflow-hidden rounded-md">
                    <img
                      src={photo.url}
                      alt={`Photo of ${yarn.brand} ${yarn.productLine}`}
                      className="h-auto w-full object-cover transition-all hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error fetching yarn:", error);
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Yarn</h2>
        <p className="mt-2">There was a problem loading the yarn details.</p>
        <Link href="/dashboard/yarns">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Yarns
          </Button>
        </Link>
      </div>
    );
  }
} 