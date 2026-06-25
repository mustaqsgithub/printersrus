import { NextRequest, NextResponse } from "next/server";
import { initDatabase } from "@/lib/database";
import {
  createAdminUser,
  getUserByEmail,
  isAdminRegistered,
  resolveOwnerRole,
  updateUserPasswordAndRole,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, setupKey } = body;

    if (!process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: "ADMIN_SETUP_KEY is not configured." }, { status: 500 });
    }

    if (!setupKey || setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: "Invalid setup key." }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    await initDatabase();

    const existing = await getUserByEmail(email);
    if (existing) {
      const updated = await updateUserPasswordAndRole({
        email,
        password,
        role: resolveOwnerRole(email),
        verifyEmail: true,
      });
      return NextResponse.json({ user: updated, updated: true });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { message: "First and last name are required to create a new admin." },
        { status: 400 }
      );
    }

    const adminExists = await isAdminRegistered();
    if (adminExists) {
      return NextResponse.json(
        { message: "Admin already exists. Use the existing email to reset." },
        { status: 409 }
      );
    }

    const admin = await createAdminUser({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: resolveOwnerRole(email),
    });

    return NextResponse.json({ user: admin, created: true });
  } catch (error) {
    console.error("Error resetting admin:", error);
    return NextResponse.json({ message: "Failed to reset admin." }, { status: 500 });
  }
}
