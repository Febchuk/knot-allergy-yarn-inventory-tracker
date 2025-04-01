import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    
    const yarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        photos: true,
        tags: true,
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true
          }
        },
        organization: {
          include: {
            type: true
          }
        }
      },
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    const response = NextResponse.json(yarn);
    
    // Add cache control headers to prevent stale data
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error fetching yarn:", error);
    return NextResponse.json(
      { error: "Error fetching yarn" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    
    // First check if the yarn exists and belongs to this user
    const existingYarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingYarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    // Parse the request body
    const requestData = await request.json();
    
    // Extract organization, tags, and projects data from the request
    const { organization, tags, projectIds, ...yarnData } = requestData;
    console.log("Received request data:", JSON.stringify(requestData));
    console.log("Project IDs:", JSON.stringify(projectIds));

    // Update the yarn without tags or organization (we'll handle them separately)
    await prisma.yarn.update({
      where: {
        id,
      },
      data: yarnData,
    });

    // Handle organization updates
    if (organization) {
      // Delete existing organization entries
      await prisma.yarnOrganization.deleteMany({
        where: { yarnId: id }
      });
      
      // Create new organization entries
      if (organization.length > 0) {
        await prisma.$transaction(
          organization.map((org: { typeId: string; quantity: number }) => 
            prisma.yarnOrganization.create({
              data: {
                typeId: org.typeId,
                quantity: org.quantity,
                yarnId: id
              }
            })
          )
        );
      }
    }

    // Handle tags updates
    if (tags !== undefined) {
      // First, disconnect all existing tags
      await prisma.yarn.update({
        where: { id },
        data: {
          tags: {
            deleteMany: {},
          },
        },
      });

      // Then create new tags if there are any
      if (tags.length > 0) {
        await prisma.yarn.update({
          where: { id },
          data: {
            tags: {
              create: tags.map((tag: string) => ({
                name: tag,
              })),
            },
          },
        });
      }
    }

    // Handle project connections if provided
    if (projectIds !== undefined) {
      console.log("Updating projects with IDs:", JSON.stringify(projectIds));
      await prisma.yarn.update({
        where: { id },
        data: {
          projects: {
            set: [], // Disconnect all existing projects
            connect: projectIds.map((projectId: string) => ({ id: projectId })),
          },
        },
      });
    }

    // Return the updated yarn with all relations
    const updatedYarn = await prisma.yarn.findUnique({
      where: { id },
      include: {
        tags: true,
        photos: true,
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true
          }
        },
        organization: {
          include: {
            type: true
          }
        }
      },
    });

    const response = NextResponse.json(updatedYarn);
    
    // Add cache control headers to prevent stale data
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error updating yarn:", error);
    return NextResponse.json(
      { error: "Error updating yarn" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    
    // First check if the yarn exists and belongs to this user
    const existingYarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingYarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    // Delete related organization entries
    await prisma.yarnOrganization.deleteMany({
      where: {
        yarnId: id,
      },
    });

    // Delete the yarn
    await prisma.yarn.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Yarn deleted successfully" });
  } catch (error) {
    console.error("Error deleting yarn:", error);
    return NextResponse.json(
      { error: "Error deleting yarn" },
      { status: 500 }
    );
  }
} 