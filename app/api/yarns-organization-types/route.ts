import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organizationTypes = await prisma.yarnOrganizationType.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(organizationTypes);
  } catch (error) {
    console.error("Error fetching organization types:", error);
    return NextResponse.json(
      { error: "Error fetching organization types" },
      { status: 500 }
    );
  }
} 