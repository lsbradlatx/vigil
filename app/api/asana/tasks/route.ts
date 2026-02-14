import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTasks, getWorkspaces } from "@/lib/asana";

export async function GET() {
  try {
    const row = await prisma.asanaToken.findFirst();
    if (!row) return NextResponse.json([]);
    const workspaceGid = row.workspaceGid ?? (await getWorkspaces(row.accessToken))[0]?.gid;
    if (!workspaceGid) return NextResponse.json([]);
    const tasks = await getTasks(row.accessToken, workspaceGid);
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch Asana tasks" },
      { status: 500 }
    );
  }
}
