import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import {
  createUserWithRole,
  getUserByEmail,
  listUsers,
  updateUserPasswordById,
  updateUserRole,
} from "@/lib/auth";

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, role } = body;
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
    }

    const user = await createUserWithRole({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "admin",
      verifyEmail: true,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ message: "Failed to create user." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const { id, role, password } = body;
    if (!id) {
      return NextResponse.json({ message: "User id is required." }, { status: 400 });
    }

    let updatedUser = null;
    if (role) {
      updatedUser = await updateUserRole(id, role);
    }
    if (password) {
      updatedUser = await updateUserPasswordById(id, password);
    }

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ message: "Failed to update user." }, { status: 500 });
  }
}
