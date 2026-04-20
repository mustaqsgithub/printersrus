import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  createSession,
  getUserByEmail,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(user.password_hash, password)) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  if (!user.email_verified_at) {
    const verification = await createEmailVerificationToken(user.id);
    const verificationUrl = `${request.nextUrl.origin}/verify?token=${verification.token}`;
    return NextResponse.json(
      { message: "Please verify your email before signing in.", verificationUrl },
      { status: 403 }
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: toAuthUser(user) });
  setSessionCookie(response, token, expiresAt);
  return response;
}
