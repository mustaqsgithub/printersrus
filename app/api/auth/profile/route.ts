import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  getSessionUser,
  getUserByEmail,
  toAuthUser,
  updateUser,
} from "@/lib/auth";
import { getSessionToken, getOrigin } from "@/lib/auth-cookies";

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
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const updates = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
  };

  const emailChanged = updates.email && updates.email !== sessionUser.email;

  if (updates.email && updates.email !== sessionUser.email) {
    const existing = await getUserByEmail(updates.email);
    if (existing && existing.id !== sessionUser.id) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
    }
  }

  const user = await updateUser(sessionUser.id, {
    ...updates,
    emailVerifiedAt: emailChanged ? null : (sessionUser.email_verified_at ? new Date(sessionUser.email_verified_at) : null),
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  let verificationUrl: string | undefined;
  if (emailChanged) {
    const verification = await createEmailVerificationToken(sessionUser.id);
    verificationUrl = `${getOrigin(request)}/verify?token=${verification.token}`;
  }

  return NextResponse.json({ user: toAuthUser(user), verificationUrl });
}
