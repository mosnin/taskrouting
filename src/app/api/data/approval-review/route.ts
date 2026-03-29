import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvals, tasks, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approvalId, status, note } = await request.json();

  const [approval] = await db
    .update(approvals)
    .set({
      status,
      reviewerId: user.id,
      decisionNote: note || null,
    })
    .where(eq(approvals.id, approvalId))
    .returning();

  // Update task approval state
  await db
    .update(tasks)
    .set({ approvalState: status })
    .where(eq(tasks.id, approval.taskId));

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  if (memberships.length > 0) {
    await emitEvent({
      workspaceId: memberships[0].workspaceId,
      eventType: status === "APPROVED" ? "approval_granted" : "approval_denied",
      actorType: "USER",
      actorId: user.id,
      entityType: "Approval",
      entityId: approval.id,
      metadata: { taskId: approval.taskId, status },
    });
  }

  return NextResponse.json({ approval });
}
