import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaces } from "@/lib/asana";
import { getUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { token, workspaceGid } = body as { token?: string; workspaceGid?: string | null };
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    await getWorkspaces(token.trim());
    const existing = await prisma.asanaToken.findUnique({ where: { userId } });
    if (existing) {
      await prisma.asanaToken.update({
        where: { userId },
        data: { accessToken: token.trim(), workspaceGid: workspaceGid ?? null },
      });
    } else {
      await prisma.asanaToken.create({
        data: {
          accessToken: token.trim(),
          workspaceGid: workspaceGid ?? null,
          userId,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect Asana" },
      { status: 400 }
    );
  }
}
