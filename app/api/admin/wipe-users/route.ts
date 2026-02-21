import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function wipeIfAuthorized(request: NextRequest): Promise<NextResponse> {
  if (process.env.ALLOW_WIPE_USERS !== "true") {
    return NextResponse.json({ error: "Wipe endpoint disabled" }, { status: 403 });
  }

  const secret = process.env.WIPE_SECRET;
  if (!secret || secret.trim() === "") {
    return NextResponse.json({ error: "Wipe not configured" }, { status: 503 });
  }

  let provided: string | null = null;
  if (request.method === "GET") {
    provided = request.nextUrl.searchParams.get("secret");
  } else {
    const body = await request.json().catch(() => ({}));
    provided = (body as { secret?: string }).secret ?? request.nextUrl.searchParams.get("secret");
  }

  if (provided !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  try {
    await prisma.verificationToken.deleteMany({});
    await prisma.user.deleteMany({});
    return NextResponse.json({ ok: true, message: "All user data and verification tokens deleted." });
  } catch (e) {
    console.error("Wipe users error:", e);
    return NextResponse.json({ error: "Wipe failed" }, { status: 500 });
  }
}

/**
 * GET or POST /api/admin/wipe-users?secret=YOUR_WIPE_SECRET
 * Deletes all users and related data so you can re-register with the same email.
 * Set WIPE_SECRET in env, call once, then remove WIPE_SECRET.
 */
export async function GET(request: NextRequest) {
  return wipeIfAuthorized(request);
}

export async function POST(request: NextRequest) {
  return wipeIfAuthorized(request);
}
