import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getLoginRedirectBase(request: NextRequest): string {
  const canonical = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (canonical) return canonical;
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (proto && host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const base = getLoginRedirectBase(request);

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_token", base));
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.redirect(new URL("/auth/login?error=invalid_token", base));
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(new URL("/auth/login?error=expired_token", base));
    }

    await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.redirect(new URL("/auth/login?verified=true", base));
  } catch (e) {
    console.error("Email verification error:", e);
    return NextResponse.redirect(new URL("/auth/login?error=verification_failed", base));
  }
}
