import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = request.nextUrl.pathname.match(/\/api\/projects\/(.+?)\/yarns/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const data = await request.json();
    const { yarnId } = data;

    if (!yarnId) {
      return NextResponse.json({ error: "Yarn ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const yarn = await prisma.yarn.update({
      where: { id: yarnId },
      data: {
        projects: {
          connect: { id: project.id }
        },
        totalWeight: 0,
        totalYards: 0,
      },
    });

    return NextResponse.json({ message: "Yarn added to project" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = request.nextUrl.pathname.match(/\/api\/projects\/(.+?)\/yarns/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const data = await request.json();
    const { yarnId } = data;

    if (!yarnId) {
      return NextResponse.json({ error: "Yarn ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const yarn = await prisma.yarn.findUnique({
      where: {
        id: yarnId,
        userId: session.user.id,
      },
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    await prisma.project.update({
      where: {
        id,
      },
      data: {
        yarns: {
          update: {
            where: {
              id: yarnId,
            },
            data: {
              quantity: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({ message: "Yarn quantity updated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = request.nextUrl.pathname.match(/\/api\/projects\/(.+?)\/yarns/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const data = await request.json();
    const { yarnId } = data;

    if (!yarnId) {
      return NextResponse.json({ error: "Yarn ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.update({
      where: {
        id,
      },
      data: {
        yarns: {
          disconnect: {
            id: yarnId,
          },
        },
      },
    });

    return NextResponse.json({ message: "Yarn removed from project" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 