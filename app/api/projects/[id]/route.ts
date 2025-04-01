import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

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
    
    const project = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        yarns: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Error fetching project" },
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
    
    // First check if the project exists and belongs to this user
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse the request body
    const requestData = await request.json();
    
    // Extract yarns data from the request if present
    const { yarnIds, ...projectData } = requestData;

    // Update the project
    await prisma.project.update({
      where: {
        id,
      },
      data: projectData,
    });

    // Handle yarns separately if provided
    if (yarnIds) {
      await prisma.project.update({
        where: { id },
        data: {
          yarns: {
            set: [], // Disconnect all existing yarns
            connect: yarnIds.map((yarnId: string) => ({ id: yarnId })),
          },
        },
      });
    }

    // Return the updated project with all relations
    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        yarns: true,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error updating project" },
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
    
    // First check if the project exists and belongs to this user
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete the project
    await prisma.project.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Error deleting project" },
      { status: 500 }
    );
  }
} 