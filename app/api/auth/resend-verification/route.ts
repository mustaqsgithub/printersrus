import { NextRequest, NextResponse } from "next/server";
import { createEmailVerificationToken, getSessionUser, toAuthUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.email_verified_at) {
    return NextResponse.json({ user: toAuthUser(user) });
  }

  const verification = await createEmailVerificationToken(user.id);
  const verificationUrl = `${request.nextUrl.origin}/verify?token=${verification.token}`;
  return NextResponse.json({ user: toAuthUser(user), verificationUrl });
}
