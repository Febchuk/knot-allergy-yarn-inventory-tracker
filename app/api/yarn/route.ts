import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const brand = searchParams.get("brand") || "";

    const skip = (page - 1) * limit;

    const where = {
      userId: session.user.id,
      ...(tag && {
        tags: {
          some: {
            name: tag,
          },
        },
      }),
      ...(brand && {
        brand: {
          equals: brand,
        },
      }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            brand: {
              contains: search,
            },
          },
          {
            color: {
              contains: search,
            },
          },
        ],
      }),
    };

    const [yarns, total] = await Promise.all([
      prisma.yarn.findMany({
        where,
        include: {
          photos: true,
          tags: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.yarn.count({ where }),
    ]);

    return NextResponse.json({
      yarns,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { name, brand, color, weight, length, tags } = data;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const yarn = await prisma.yarn.create({
      data: {
        name,
        brand,
        color,
        weight,
        length,
        userId: session.user.id,
        ...(tags && {
          tags: {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        }),
      },
      include: {
        photos: true,
        tags: true,
      },
    });

    return NextResponse.json(yarn);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 