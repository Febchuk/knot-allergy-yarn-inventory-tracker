import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

type YarnPhoto = {
  id: string;
  url: string;
  yarnId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = request.nextUrl.pathname.match(/\/api\/yarn\/(.+?)\/photos/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid yarn ID" }, { status: 400 });
    }

    const data = await request.json();
    const { url } = data;

    if (!url) {
      return NextResponse.json({ error: "Photo URL is required" }, { status: 400 });
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

    const photo = await prisma.yarnPhoto.create({
      data: {
        url,
        yarnId: id,
      },
    });

    return NextResponse.json(photo);
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

    const { id } = request.nextUrl.pathname.match(/\/api\/yarn\/(.+?)\/photos/)?.groups || {};

    if (!id) {
      return NextResponse.json({ error: "Invalid yarn ID" }, { status: 400 });
    }

    const data = await request.json();
    const { photoId } = data;

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
    }

    const yarn = await prisma.yarn.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        photos: true,
      },
    });

    if (!yarn) {
      return NextResponse.json({ error: "Yarn not found" }, { status: 404 });
    }

    const photo = yarn.photos.find((p: YarnPhoto) => p.id === photoId);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await prisma.yarnPhoto.delete({
      where: {
        id: photoId,
      },
    });

    return NextResponse.json({ message: "Photo deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 