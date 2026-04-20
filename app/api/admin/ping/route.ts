import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const user = await getSessionUser(token);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
