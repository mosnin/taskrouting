import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runLogs, workspaceMembers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ logs: [] });

  const workspaceId = memberships[0].workspaceId;
  const logs = await db
    .select()
    .from(runLogs)
    .where(eq(runLogs.workspaceId, workspaceId))
    .orderBy(desc(runLogs.createdAt))
    .limit(100);

  return NextResponse.json({ logs });
}
