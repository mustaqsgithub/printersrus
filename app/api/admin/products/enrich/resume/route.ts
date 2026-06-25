import { NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { triggerEnrichment } from "@/lib/enrichment";

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
};

// Re-queue failed/stuck rows and (re)start the background worker. Used to
// recover after a server restart or to retry failures.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const requeuedStuck = await dbHelpers.resetStuckEnrichment();
  const requeuedFailed = await dbHelpers.requeueFailedEnrichment();
  triggerEnrichment();

  return NextResponse.json({
    requeued: requeuedStuck + requeuedFailed,
    counts: await dbHelpers.countEnrichmentStatuses(),
  });
}
