import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toAuthUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";
import { getDb } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const sessionUser = await getSessionUser(token);
  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.emailNotifications !== "boolean") {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `UPDATE users SET email_notifications = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(body.emailNotifications ? 1 : 0, sessionUser.id);

  const updated = db.prepare(
    `SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at FROM users WHERE id = ?`
  ).get(sessionUser.id) as any;

  return NextResponse.json({ user: toAuthUser(updated) });
}
