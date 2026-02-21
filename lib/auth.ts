import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
});

export async function getUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();

  // Some older/stale JWT sessions may miss user.id; fall back to email lookup.
  if (!userId) {
    if (!email) return null;
    const userByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return userByEmail?.id ?? null;
  }

  // Sessions can outlive DB resets/user deletions; validate user still exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (user?.id) return user.id;

  // If id is stale but email is still valid, recover gracefully.
  if (email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return userByEmail?.id ?? null;
  }
  return null;
}
