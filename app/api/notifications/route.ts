import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";
import { dbHelpers } from "@/lib/database";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const notifications = await dbHelpers.getNotificationsByEmail((user as any).email);
  const unreadCount = await dbHelpers.getUnreadNotificationCount((user as any).email);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = (user as any).email;

  if (body.markAllRead) {
    await dbHelpers.markAllNotificationsRead(email);
  } else if (body.notificationId) {
    await dbHelpers.markNotificationRead(body.notificationId, email);
  } else {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const unreadCount = await dbHelpers.getUnreadNotificationCount(email);
  return NextResponse.json({ unreadCount });
}
