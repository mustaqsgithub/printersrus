import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toAuthUser, verifyEmailToken } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.token) {
    return NextResponse.json({ message: "Verification token is required." }, { status: 400 });
  }

  const user = await verifyEmailToken(body.token);
  if (!user) {
    return NextResponse.json({ message: "Invalid or expired verification link." }, { status: 400 });
  }

  const sessionToken = await getSessionToken();
  if (sessionToken) {
    const sessionUser = await getSessionUser(sessionToken);
    if (sessionUser && sessionUser.id !== user.id) {
      return NextResponse.json({ user: toAuthUser(user) });
    }
  }

  return NextResponse.json({ user: toAuthUser(user) });
}
