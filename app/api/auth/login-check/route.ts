import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type LoginCheckBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as LoginCheckBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, code: "MISSING_FIELDS", message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          code: "ACCOUNT_NOT_FOUND",
          message: "No account exists for this email. Create an account first.",
        },
        { status: 404 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_NOT_VERIFIED",
          message: "Your account exists, but email is not verified yet.",
        },
        { status: 403 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, code: "WRONG_PASSWORD", message: "Password is incorrect." },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("login-check failed:", error);
    return NextResponse.json(
      { ok: false, code: "LOGIN_CHECK_FAILED", message: "Could not validate credentials." },
      { status: 500 },
    );
  }
}
