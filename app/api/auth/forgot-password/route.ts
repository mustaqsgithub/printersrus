import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken, getUserByEmail } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const user = await getUserByEmail(body.email);
  if (!user) {
    // Don't reveal whether the email exists
    return NextResponse.json({ ok: true });
  }

  const reset = await createPasswordResetToken(user.id);
  const resetUrl = `${request.nextUrl.origin}/reset-password?token=${reset.token}`;

  await sendPasswordResetEmail({
    recipientEmail: user.email,
    recipientName: user.first_name,
    resetUrl,
  });

  return NextResponse.json({ ok: true });
}
