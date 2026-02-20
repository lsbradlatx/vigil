import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const dateParam = searchParams.get("date");

    type WhereClause = { userId: string; start?: { gte: Date }; end?: { lte: Date }; AND?: Array<Record<string, unknown>> };

    let where: WhereClause = { userId };
    if (dateParam) {
      const d = new Date(dateParam);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      where = {
        userId,
        AND: [
          { start: { lte: dayEnd } },
          { end: { gte: dayStart } },
        ],
      };
    } else {
      if (startParam) where.start = { gte: new Date(startParam) };
      if (endParam) where.end = { lte: new Date(endParam) };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { start: "asc" },
    });
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, start, end, allDay, color } = body as {
      title: string;
      start: string;
      end: string;
      allDay?: boolean;
      color?: string | null;
    };
    if (!title?.trim() || !start || !end) {
      return NextResponse.json(
        { error: "title, start, and end are required" },
        { status: 400 }
      );
    }
    const event = await prisma.calendarEvent.create({
      data: {
        title: title.trim(),
        start: new Date(start),
        end: new Date(end),
        allDay: !!allDay,
        color: color ?? null,
        userId,
      },
    });
    return NextResponse.json(event);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
