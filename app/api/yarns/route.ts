import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user's yarns
    const yarns = await prisma.yarn.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        brand: true,
        productLine: true,
        currColor: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(yarns);
  } catch (error) {
    console.error("Error fetching yarns:", error);
    return NextResponse.json(
      { error: "Error fetching yarns" },
      { status: 500 }
    );
  }
} 