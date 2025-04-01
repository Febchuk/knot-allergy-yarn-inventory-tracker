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
            brand: {
              contains: search,
            },
          },
          {
            productLine: {
              contains: search,
            },
          },
          {
            prevColor: {
              contains: search,
            },
          },
          {
            currColor: {
              contains: search,
            },
          },
          {
            nextColor: {
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
          projects: true,
          organization: {
            include: {
              type: true
            }
          }
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
    const { 
      brand, 
      productLine, 
      prevColor, 
      currColor, 
      nextColor, 
      dyeStatus, 
      materials, 
      weight, 
      yardsPerOz, 
      totalWeight, 
      totalYards, 
      organization, 
      tags 
    } = data;

    if (!brand || !productLine) {
      return NextResponse.json({ error: "Brand and product line are required" }, { status: 400 });
    }

    const parsedTags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : []);

    // Create the yarn record first
    const yarn = await prisma.yarn.create({
      data: {
        brand,
        productLine,
        prevColor,
        currColor,
        nextColor,
        dyeStatus,
        materials,
        weight,
        yardsPerOz,
        totalWeight,
        totalYards,
        userId: session.user.id,
        ...(parsedTags.length > 0 && {
          tags: {
            create: parsedTags.map((tag: string) => ({
              name: tag,
            })),
          },
        }),
      },
    });

    // If organization data is provided, create the organization entries
    if (organization && Array.isArray(organization) && organization.length > 0) {
      await prisma.yarnOrganization.createMany({
        data: organization.map(org => ({
          typeId: org.typeId,
          quantity: org.quantity,
          yarnId: yarn.id,
        })),
      });
    }

    // Fetch the complete yarn data with all relations
    const completeYarn = await prisma.yarn.findUnique({
      where: { id: yarn.id },
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
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 