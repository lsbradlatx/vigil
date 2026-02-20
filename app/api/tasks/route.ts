import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dueDateParam = searchParams.get("dueDate");
    const dueMinParam = searchParams.get("dueMin");
    const dueMaxParam = searchParams.get("dueMax");

    const where: { userId: string; dueDate?: Date | { gte?: Date; lte?: Date } | null } = { userId };
    if (dueDateParam) {
      const d = new Date(dueDateParam);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    } else if (dueMinParam || dueMaxParam) {
      const range: { gte?: Date; lte?: Date } = {};
      if (dueMinParam) range.gte = new Date(dueMinParam);
      if (dueMaxParam) range.lte = new Date(dueMaxParam);
      where.dueDate = range;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, dueDate, order } = body as {
      title?: string;
      dueDate?: string | null;
      order?: number;
    };
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }
    const maxOrder = await prisma.task.aggregate({
      where: { userId },
      _max: { order: true },
    });
    const nextOrder = order ?? (maxOrder._max.order ?? -1) + 1;
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        order: nextOrder,
        userId,
      },
    });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
