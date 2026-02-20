import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTasks, getWorkspaces } from "@/lib/asana";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row = await prisma.asanaToken.findUnique({ where: { userId } });
    if (!row) return NextResponse.json([]);
    const workspaceGid = row.workspaceGid ?? (await getWorkspaces(row.accessToken))[0]?.gid;
    if (!workspaceGid) return NextResponse.json([]);
    const tasks = await getTasks(row.accessToken, workspaceGid);
    return NextResponse.json(tasks);
  } catch (e) {
    console.error("Asana tasks error:", e);
    return NextResponse.json([]);
  }
}
