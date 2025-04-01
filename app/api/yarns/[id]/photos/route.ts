import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

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