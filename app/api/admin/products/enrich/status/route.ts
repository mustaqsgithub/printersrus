import { NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { isEnrichmentRunning } from "@/lib/enrichment";

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

  const counts = await dbHelpers.countEnrichmentStatuses();
  return NextResponse.json({ counts, running: isEnrichmentRunning() });
}
