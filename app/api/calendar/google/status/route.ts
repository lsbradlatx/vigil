import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = await prisma.googleCalendarToken.findFirst();
    return NextResponse.json({ connected: !!token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ connected: false });
  }
}
