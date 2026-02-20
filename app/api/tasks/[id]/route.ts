import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await _request.json();
    const { title, completed, dueDate, order } = body as {
      title?: string;
      completed?: boolean;
      dueDate?: string | null;
      order?: number;
    };
    const data: { title?: string; completed?: boolean; dueDate?: Date | null; order?: number } = {};
    if (typeof title === "string") data.title = title.trim();
    if (typeof completed === "boolean") data.completed = completed;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (typeof order === "number") data.order = order;

    const task = await prisma.task.update({
      where: { id, userId },
      data,
    });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.task.deleteMany({ where: { id, userId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
