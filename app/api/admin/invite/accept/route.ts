import { NextRequest, NextResponse } from "next/server";
import { getValidInvitation, acceptAdminInvitation, getUserByEmail } from "@/lib/auth";

// GET ?token=... — validate an invite link and tell the page what to render:
// the invited email, and whether that email already has an account (in which
// case they activate by signing in rather than choosing a new password).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, message: "Missing token." }, { status: 400 });
  }

  const invitation = await getValidInvitation(token);
  if (!invitation) {
    return NextResponse.json(
      { valid: false, message: "This invitation is invalid or has expired." },
      { status: 404 }
    );
  }

  const existing = await getUserByEmail(invitation.email);
  return NextResponse.json({
    valid: true,
    email: invitation.email,
    existingAccount: Boolean(existing),
  });
}

// POST — accept the invitation. For a brand-new account, firstName/lastName/
// password are required; for an existing account they are ignored (the user
// keeps their current credentials and is simply promoted).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { token, firstName, lastName, password } = body || {};
    if (!token) {
      return NextResponse.json({ message: "Missing token." }, { status: 400 });
    }

    const result = await acceptAdminInvitation({ token, firstName, lastName, password });
    if (!result.ok) {
      const message =
        result.reason === "missing_fields"
          ? "First name, last name and password are required."
          : "This invitation is invalid or has expired.";
      const status = result.reason === "missing_fields" ? 400 : 404;
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json({
      message: result.existingAccount
        ? "Your account has been upgraded to admin. Please sign in."
        : "Your admin account is ready. Please sign in.",
      existingAccount: result.existingAccount,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ message: "Failed to accept invitation." }, { status: 500 });
  }
}
