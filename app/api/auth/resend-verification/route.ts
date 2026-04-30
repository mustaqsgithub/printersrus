import { NextRequest, NextResponse } from "next/server";
import { createEmailVerificationToken, getSessionUser, toAuthUser } from "@/lib/auth";
import { getSessionToken, getOrigin } from "@/lib/auth-cookies";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.email_verified_at) {
    return NextResponse.json({ user: toAuthUser(user) });
  }

  const verification = await createEmailVerificationToken(user.id);
  const verificationUrl = `${getOrigin(request)}/verify?token=${verification.token}`;

  // Send verification email
  const emailResult = await sendVerificationEmail({
    recipientEmail: user.email,
    recipientName: user.first_name,
    verificationUrl,
  });
  if (!emailResult.success) {
    console.error(`[RESEND] Verification email failed for ${user.email}: ${emailResult.error}`);
  }

  return NextResponse.json({ user: toAuthUser(user), verificationUrl });
}
