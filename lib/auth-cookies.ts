import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "session_token";
const isSecure = process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";

export function getOrigin(request: NextRequest): string {
  return process.env.BASE_URL || request.nextUrl.origin;
}

export const getSessionToken = async () => {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value || null;
};

export const setSessionCookie = (
  response: NextResponse,
  token: string,
  expiresAt: Date
) => {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    expires: expiresAt,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    expires: new Date(0),
  });
};
