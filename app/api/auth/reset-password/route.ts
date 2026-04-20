import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken, toAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.password) {
    return NextResponse.json({ message: "Token and password are required." }, { status: 400 });
  }

  const user = await resetPasswordWithToken(body.token, body.password);
  if (!user) {
    return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
  }

  return NextResponse.json({ user: toAuthUser(user) });
}
