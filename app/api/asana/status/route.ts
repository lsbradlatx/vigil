import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ connected: false });

    const row = await prisma.asanaToken.findUnique({ where: { userId } });
    return NextResponse.json({ connected: !!row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ connected: false });
  }
}
