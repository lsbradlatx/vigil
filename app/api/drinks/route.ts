import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const drinks = await prisma.drink.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: {
        sizes: {
          orderBy: { sizeLabel: "asc" },
        },
      },
    });
    return NextResponse.json(drinks);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch drinks" },
      { status: 500 }
    );
  }
}
