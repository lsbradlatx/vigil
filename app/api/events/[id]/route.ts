import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await _request.json();
    const { title, start, end, allDay, color } = body as {
      title?: string;
      start?: string;
      end?: string;
      allDay?: boolean;
      color?: string | null;
    };
    const data: {
      title?: string;
      start?: Date;
      end?: Date;
      allDay?: boolean;
      color?: string | null;
    } = {};
    if (typeof title === "string") data.title = title.trim();
    if (start !== undefined) data.start = new Date(start);
    if (end !== undefined) data.end = new Date(end);
    if (typeof allDay === "boolean") data.allDay = allDay;
    if (color !== undefined) data.color = color ?? null;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
    });
    return NextResponse.json(event);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.calendarEvent.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
