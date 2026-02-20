import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || user.emailVerified) {
      return NextResponse.json({ message: "If that email exists and is unverified, a new link has been sent." });
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: trimmedEmail },
    });

    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: trimmedEmail,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const fwdProto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");
    const origin = request.headers.get("origin")
      ?? (fwdProto && host ? `${fwdProto}://${host}` : null)
      ?? new URL(request.url).origin;

    await sendVerificationEmail(trimmedEmail, token, origin);

    return NextResponse.json({ message: "If that email exists and is unverified, a new link has been sent." });
  } catch (e) {
    console.error("Resend verification error:", e);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 },
    );
  }
}
