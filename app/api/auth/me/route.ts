import { NextResponse } from "next/server";
import { getSessionUser, toAuthUser } from "@/lib/auth";
import { clearSessionCookie, getSessionToken } from "@/lib/auth-cookies";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await getSessionUser(token);
  if (!user) {
    const response = NextResponse.json({ user: null });
    clearSessionCookie(response);
    return response;
  }

  return NextResponse.json({ user: toAuthUser(user) });
}
