import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = request.nextUrl.pathname.match(/\/api\/yarn\/(.+)/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid yarn ID" }, { status: 400 });
    }

    const yarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    const data = await request.json();

    const updatedYarn = await prisma.yarn.update({
      where: {
        id,
      },
      data,
      include: {
        photos: true,
        tags: true,
        projects: true,
      },
    });

    return NextResponse.json(updatedYarn);
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

    const { id } = request.nextUrl.pathname.match(/\/api\/yarn\/(.+)/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid yarn ID" }, { status: 400 });
    }

    const yarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    await prisma.yarn.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Yarn deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 