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