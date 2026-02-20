import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health — readiness check (database connectivity).
 * Returns 200 { ok: true } if DB is reachable, 503 { ok: false, error: "database" } otherwise.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Health check failed:", e);
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }
}
