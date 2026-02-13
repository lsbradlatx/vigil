import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const where: { start?: { gte: Date }; end?: { lte: Date } } = {};
    if (startParam) where.start = { gte: new Date(startParam) };
    if (endParam) where.end = { lte: new Date(endParam) };

    const events = await prisma.calendarEvent.findMany({
      where: Object.keys(where).length ? where : undefined,
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
