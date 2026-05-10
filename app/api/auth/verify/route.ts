import { NextRequest, NextResponse } from "next/server";
import { createSession, toAuthUser, verifyEmailToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.token) {
    return NextResponse.json({ message: "Verification token is required." }, { status: 400 });
  }

  const user = await verifyEmailToken(body.token);
  if (!user) {
    return NextResponse.json({ message: "Invalid or expired verification link." }, { status: 400 });
  }

  // Create session after successful email verification
  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    user: toAuthUser(user),
    message: "Email verified successfully. You are now logged in."
  });
  setSessionCookie(response, token, expiresAt);

  return response;
}
