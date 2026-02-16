import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_SUBSTANCES = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const limitParam = searchParams.get("limit");

    const where: { loggedAt?: { gte?: Date; lte?: Date } } = {};
    if (startParam) where.loggedAt = { ...where.loggedAt, gte: new Date(startParam) };
    if (endParam) where.loggedAt = { ...where.loggedAt, lte: new Date(endParam) };

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

    const logs = await prisma.stimulantLog.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { loggedAt: "desc" },
      take: limit,
    });
    return NextResponse.json(logs);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch stimulant logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { substance, amount, amountMg, drinkSizeId, loggedAt, notes } = body as {
      substance: string;
      amount?: string | null;
      amountMg?: number | null;
      drinkSizeId?: string | null;
      loggedAt?: string;
      notes?: string | null;
    };
    if (!substance || !VALID_SUBSTANCES.includes(substance as typeof VALID_SUBSTANCES[number])) {
      return NextResponse.json(
        { error: "substance must be CAFFEINE, ADDERALL, DEXEDRINE, or NICOTINE" },
        { status: 400 }
      );
    }

    let finalAmount: string | null = amount?.trim() ?? null;
    let finalAmountMg: number | null = amountMg != null && Number.isFinite(amountMg) ? amountMg : null;

    if (substance === "CAFFEINE" && drinkSizeId) {
      const drinkSize = await prisma.drinkSize.findUnique({
        where: { id: drinkSizeId },
        include: { drink: true },
      });
      if (drinkSize) {
        finalAmountMg = drinkSize.caffeineMg;
        const drink = drinkSize.drink;
        finalAmount = drink.brand
          ? `${drinkSize.sizeLabel} ${drink.brand} ${drink.name}`
          : `${drinkSize.sizeLabel} ${drink.name}`;
      }
    }

    const log = await prisma.stimulantLog.create({
      data: {
        substance,
        amount: finalAmount,
        amountMg: finalAmountMg,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes: notes?.trim() ?? null,
      },
    });
    return NextResponse.json(log);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create stimulant log" },
      { status: 500 }
    );
  }
}
