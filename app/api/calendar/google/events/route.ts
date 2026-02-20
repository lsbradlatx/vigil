import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end query params required (ISO date strings)" },
        { status: 400 }
      );
    }
    const tokenRow = await prisma.googleCalendarToken.findUnique({ where: { userId } });
    if (!tokenRow) {
      return NextResponse.json([]);
    }
    const events = await getCalendarEvents(tokenRow.refreshToken, startParam, endParam);
    return NextResponse.json(events);
  } catch (e) {
    console.error("Google Calendar events error:", e);
    return NextResponse.json([]);
  }
}
