import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    
    const yarn = await prisma.yarn.findUnique({
      where: {
        id,
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
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    return NextResponse.json(yarn);
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
    
    // Extract organization and tags data from the request
    const { organization, tags, ...yarnData } = requestData;

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

    // Handle tags separately
    if (tags) {
      // Disconnect all existing tags
      const currentTags = await prisma.yarnTag.findMany({
        where: { yarnId: id },
      });
      
      if (currentTags.length > 0) {
        await prisma.yarnTag.deleteMany({
          where: { yarnId: id }
        });
      }

      // Create new tags
      if (tags.length > 0) {
        await prisma.$transaction(
          tags.map((tag: string) => 
            prisma.yarnTag.create({
              data: {
                name: tag,
                yarnId: id
              }
            })
          )
        );
      }
    }

    // Return the updated yarn with all relations
    const completeYarn = await prisma.yarn.findUnique({
      where: { id },
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
    });

    return NextResponse.json(completeYarn);
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