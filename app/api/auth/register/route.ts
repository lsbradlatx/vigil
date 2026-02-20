import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (
      !username?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 },
      );
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < USERNAME_MIN || trimmedUsername.length > USERNAME_MAX) {
      return NextResponse.json(
        { error: `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, hyphens, and underscores" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    if (password.length < PASSWORD_MIN) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN} characters` },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          { username: trimmedUsername },
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.email === trimmedEmail ? "email" : "username";
      return NextResponse.json(
        { error: `An account with this ${field} already exists` },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        passwordHash,
      },
    });

    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
      (() => {
        const fwdProto = request.headers.get("x-forwarded-proto");
        const host = request.headers.get("host");
        return request.headers.get("origin")
          ?? (fwdProto && host ? `${fwdProto}://${host}` : null)
          ?? new URL(request.url).origin;
      })();

    const emailResult = await sendVerificationEmail(user.email, token, baseUrl);

    if (!emailResult.ok) {
      console.error("Verification email failed:", emailResult.error);
      return NextResponse.json(
        {
          message: "Account created, but the verification email could not be sent.",
          emailSent: false,
          hint: process.env.NODE_ENV === "development"
            ? emailResult.error
            : "Check that RESEND_API_KEY is set and that your Resend account has a verified domain (required to send to any email). Check spam or use the resend link on the next page.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { message: "Account created. Check your email to verify your account.", emailSent: true },
      { status: 201 },
    );
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
