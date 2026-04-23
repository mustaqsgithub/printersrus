import { NextRequest, NextResponse } from "next/server";
import { createEmailVerificationToken, createSession, createUser, getUserByEmail, toAuthUser } from "@/lib/auth";
import { setSessionCookie, getOrigin } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { firstName, lastName, email, phone, password } = body;
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
  }

  const user = await createUser({
    firstName,
    lastName,
    email,
    phone,
    password,
  });
  const { token, expiresAt } = await createSession(user.id);
  const verification = await createEmailVerificationToken(user.id);
  const verificationUrl = `${getOrigin(request)}/verify?token=${verification.token}`;

  const response = NextResponse.json({ user: toAuthUser(user), verificationUrl });
  setSessionCookie(response, token, expiresAt);
  return response;
}
