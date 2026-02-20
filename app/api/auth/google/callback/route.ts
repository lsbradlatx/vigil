import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, resolveOrigin } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = resolveOrigin(request);
  const base = new URL("/calendar", origin);

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (error) {
    return NextResponse.redirect(new URL(`/calendar?error=google_denied`, base));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/calendar?error=google_no_code", base));
  }

  try {
    const refreshToken = await getTokensFromCode(code, origin);
    const existing = await prisma.googleCalendarToken.findUnique({ where: { userId } });
    if (existing) {
      await prisma.googleCalendarToken.update({ where: { userId }, data: { refreshToken } });
    } else {
      await prisma.googleCalendarToken.create({ data: { refreshToken, userId } });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/calendar?error=google_token", base));
  }

  return NextResponse.redirect(new URL("/calendar?google=connected", base));
}
