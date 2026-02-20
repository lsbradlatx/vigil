import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl, resolveOrigin } from "@/lib/google-calendar";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/login?error=session_expired", request.url));
    }

    const origin = resolveOrigin(request);
    const url = getAuthUrl(origin);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/calendar?error=google_config", request.url));
  }
}
