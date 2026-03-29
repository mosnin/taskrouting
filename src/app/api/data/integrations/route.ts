import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWorkspaceIntegrations } from "@/lib/services/integration";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ providers: [] });

  const workspaceId = memberships[0].workspaceId;
  const providers = await getWorkspaceIntegrations(workspaceId);

  return NextResponse.json({ providers });
}
