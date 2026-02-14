import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.asanaToken.findFirst();
    return NextResponse.json({ connected: !!row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ connected: false });
  }
}
