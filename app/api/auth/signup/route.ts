import { NextRequest, NextResponse } from "next/server";
import { createEmailVerificationToken, createUser, getUserByEmail, toAuthUser } from "@/lib/auth";
import { getOrigin } from "@/lib/auth-cookies";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { firstName, lastName, email, phone, password } = body;
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
  }

  const user = await createUser({
    firstName,
    lastName,
    email,
    phone,
    password,
  });
  const verification = await createEmailVerificationToken(user.id);
  const verificationUrl = `${getOrigin(request)}/verify?token=${verification.token}`;

  // Send verification email
  const emailResult = await sendVerificationEmail({
    recipientEmail: user.email,
    recipientName: user.first_name,
    verificationUrl,
  });
  if (!emailResult.success) {
    console.error(`[SIGNUP] Verification email failed for ${user.email}: ${emailResult.error}`);
  }

  // Do not create session - user must verify email first
  return NextResponse.json({
    user: toAuthUser(user),
    verificationUrl,
    message: "Please check your email to verify your account before logging in."
  });
}
