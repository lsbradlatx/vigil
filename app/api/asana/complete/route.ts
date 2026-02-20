import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskCompleted } from "@/lib/asana";
import { getUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row = await prisma.asanaToken.findUnique({ where: { userId } });
    if (!row) return NextResponse.json({ error: "Not connected" }, { status: 401 });
    const body = await request.json();
    const { taskId, completed } = body as { taskId?: string; completed?: boolean };
    if (typeof taskId !== "string" || !taskId.startsWith("asana-") || typeof completed !== "boolean") {
      return NextResponse.json({ error: "taskId (asana-...) and completed required" }, { status: 400 });
    }
    const gid = taskId.replace(/^asana-/, "");
    await updateTaskCompleted(row.accessToken, gid, completed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update Asana task" },
      { status: 500 }
    );
  }
}
