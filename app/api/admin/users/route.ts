import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth-cookies";
import {
  getSessionUser,
  getUserByEmail,
  listStaff,
  listPendingInvitations,
  createAdminInvitation,
  revokeInvitation,
  demoteStaff,
} from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/roles";
import { sendAdminInviteEmail } from "@/lib/email";

// Staff management is owner-only. Only the super admin can view staff, invite
// new admins, or change roles.
const requireSuperAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || !isSuperAdminRole(user.role)) return null;
  return user;
};

const inviteUrlFor = (token: string) => {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/admin/accept-invite?token=${encodeURIComponent(token)}`;
};

// GET — list current staff and any pending (unaccepted) invitations.
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const [staff, invitations] = await Promise.all([listStaff(), listPendingInvitations()]);
    return NextResponse.json({ staff, invitations });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ message: "Failed to fetch staff." }, { status: 500 });
  }
}

// POST — invite a new admin by email. Creates an invitation and emails a link
// where the invitee sets their own credentials.
export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "A valid email is required." }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    const alreadyStaff =
      existing && (existing.role === "admin" || existing.role === "super_admin");
    if (alreadyStaff) {
      return NextResponse.json(
        { message: "That person is already an admin." },
        { status: 409 }
      );
    }

    const { token } = await createAdminInvitation({ email, invitedBy: admin.id });
    const result = await sendAdminInviteEmail({
      recipientEmail: email,
      inviteUrl: inviteUrlFor(token),
      existingAccount: Boolean(existing),
    });

    if (!result.success) {
      return NextResponse.json(
        { message: "Invitation created but the email could not be sent.", error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: "Invitation sent.", previewUrl: result.previewUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inviting admin:", error);
    return NextResponse.json({ message: "Failed to send invitation." }, { status: 500 });
  }
}

// PATCH — demote a staff member back to customer (revokes their admin access).
export async function PATCH(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const { id, action } = body || {};
    if (!id || action !== "demote") {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }
    if (id === admin.id) {
      return NextResponse.json({ message: "You cannot demote yourself." }, { status: 400 });
    }

    const result = await demoteStaff(id);
    if (!result.ok) {
      const message =
        result.reason === "last_super_admin"
          ? "Cannot demote the last super admin."
          : "User is not a staff member.";
      return NextResponse.json({ message }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (error) {
    console.error("Error demoting staff:", error);
    return NextResponse.json({ message: "Failed to update staff." }, { status: 500 });
  }
}

// DELETE — revoke a pending invitation by its id.
export async function DELETE(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ message: "Invitation id is required." }, { status: 400 });
    }
    await revokeInvitation(id);
    return NextResponse.json({ message: "Invitation revoked." });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json({ message: "Failed to revoke invitation." }, { status: 500 });
  }
}
