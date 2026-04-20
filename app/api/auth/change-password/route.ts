import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  getUserByEmail,
  verifyPassword,
  updateUserPasswordById,
  toAuthUser,
} from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const sessionUser = await getSessionUser(token);
  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: "Current password and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const userWithPassword = await getUserByEmail(sessionUser.email);
  if (!userWithPassword) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  if (!verifyPassword(userWithPassword.password_hash, currentPassword)) {
    return NextResponse.json(
      { message: "Current password is incorrect." },
      { status: 403 }
    );
  }

  const updated = await updateUserPasswordById(sessionUser.id, newPassword);
  if (!updated) {
    return NextResponse.json({ message: "Failed to update password." }, { status: 500 });
  }

  return NextResponse.json({ message: "Password changed successfully.", user: toAuthUser(updated) });
}
