import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  createSession,
  getUserByEmail,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { setSessionCookie, getOrigin } from "@/lib/auth-cookies";
import { sendVerificationEmail } from "@/lib/email";

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
    const verificationUrl = `${getOrigin(request)}/verify?token=${verification.token}`;

    // Re-send verification email
    const emailResult = await sendVerificationEmail({
      recipientEmail: user.email,
      recipientName: user.first_name,
      verificationUrl,
    });
    if (!emailResult.success) {
      console.error(`[LOGIN] Verification email failed for ${user.email}: ${emailResult.error}`);
    }

    return NextResponse.json(
      { message: "Please verify your email before signing in. A new verification email has been sent.", verificationUrl },
      { status: 403 }
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: toAuthUser(user) });
  setSessionCookie(response, token, expiresAt);
  return response;
}
