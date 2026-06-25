import { NextRequest, NextResponse } from "next/server";
import { initDatabase } from "@/lib/database";
import { createAdminUser, getUserByEmail, isAdminRegistered, resolveOwnerRole } from "@/lib/auth";

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

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    await initDatabase();

    const adminExists = await isAdminRegistered();
    if (adminExists) {
      return NextResponse.json({ message: "Admin already exists." }, { status: 409 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
    }

    const admin = await createAdminUser({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: resolveOwnerRole(email),
    });

    return NextResponse.json({ user: admin });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ message: "Failed to create admin." }, { status: 500 });
  }
}
