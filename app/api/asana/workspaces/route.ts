import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaces } from "@/lib/asana";

export async function GET() {
  try {
    const row = await prisma.asanaToken.findFirst();
    if (!row) return NextResponse.json({ error: "Not connected" }, { status: 401 });
    const workspaces = await getWorkspaces(row.accessToken);
    return NextResponse.json(workspaces);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}
