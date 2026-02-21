import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import drinksCatalog from "@/prisma/drinks-catalog.json";

type CatalogDrink = {
  name: string;
  brand: string | null;
  sizes: { sizeLabel: string; caffeineMg: number }[];
};

async function ensureDefaultDrinks() {
  const count = await prisma.drink.count();
  if (count > 0) return;

  for (const drink of drinksCatalog as CatalogDrink[]) {
    await prisma.drink.create({
      data: {
        name: drink.name,
        brand: drink.brand,
        sizes: {
          create: drink.sizes.map((s) => ({
            sizeLabel: s.sizeLabel,
            caffeineMg: s.caffeineMg,
          })),
        },
      },
    });
  }
}

export async function GET() {
  try {
    await ensureDefaultDrinks();
    const drinks = await prisma.drink.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: {
        sizes: {
          orderBy: { sizeLabel: "asc" },
        },
      },
    });
    const res = NextResponse.json(drinks);
    res.headers.set("Cache-Control", "private, max-age=300");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch drinks" },
      { status: 500 }
    );
  }
}
