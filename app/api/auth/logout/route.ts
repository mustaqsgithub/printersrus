import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { clearSessionCookie, getSessionToken } from "@/lib/auth-cookies";

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
