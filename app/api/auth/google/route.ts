import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl, resolveOrigin } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const origin = resolveOrigin(request);
    const url = getAuthUrl(origin);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/calendar?error=google_config", request.url));
  }
}
