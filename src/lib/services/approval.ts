import { db } from "@/lib/db";
import { approvals, tasks } from "@/lib/db/schema";
import type { ActorType } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function requestApproval(
  taskId: string,
  requestedByType: ActorType,
  requestedById: string
) {
  const [task] = await db
    .select({ workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("Task not found");

  const approval = await db.transaction(async (tx) => {
    const [newApproval] = await tx
      .insert(approvals)
      .values({
        taskId,
        requestedByType,
        requestedById,
        status: "PENDING",
      })
      .returning();

    await tx
      .update(tasks)
      .set({ approvalState: "PENDING", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    return newApproval;
  });

  await emitEvent({
    workspaceId: task.workspaceId,
    eventType: "approval_requested",
    actorType: requestedByType,
    actorId: requestedById,
    entityType: "approval",
    entityId: approval.id,
    metadata: { taskId },
  });

  return approval;
}

export async function reviewApproval(
  approvalId: string,
  reviewerId: string,
  status: "APPROVED" | "DENIED",
  note?: string
) {
  // Fetch approval with task workspaceId
  const results = await db
    .select({
      approval: approvals,
      taskWorkspaceId: tasks.workspaceId,
    })
    .from(approvals)
    .innerJoin(tasks, eq(approvals.taskId, tasks.id))
    .where(eq(approvals.id, approvalId))
    .limit(1);

  const result = results[0];
  if (!result) throw new Error("Approval not found");
  const existing = result.approval;

  if (existing.status !== "PENDING") {
    throw new Error("Approval has already been reviewed");
  }

  const approvalState = status === "APPROVED" ? "APPROVED" : "DENIED";

  const updatedApproval = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(approvals)
      .set({
        reviewerId,
        status,
        decisionNote: note,
        updatedAt: new Date(),
      })
      .where(eq(approvals.id, approvalId))
      .returning();

    await tx
      .update(tasks)
      .set({ approvalState, updatedAt: new Date() })
      .where(eq(tasks.id, existing.taskId));

    return updated;
  });

  const eventType = status === "APPROVED" ? "approval_granted" : "approval_denied";

  await emitEvent({
    workspaceId: result.taskWorkspaceId,
    eventType,
    actorType: "USER",
    actorId: reviewerId,
    entityType: "approval",
    entityId: updatedApproval.id,
    metadata: { taskId: existing.taskId, status, note },
  });

  return updatedApproval;
}

export async function listPendingApprovals(workspaceId: string) {
  const results = await db
    .select({
      approval: approvals,
      task: {
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        ownerType: tasks.ownerType,
        ownerId: tasks.ownerId,
      },
    })
    .from(approvals)
    .innerJoin(tasks, eq(approvals.taskId, tasks.id))
    .where(and(eq(approvals.status, "PENDING"), eq(tasks.workspaceId, workspaceId)))
    .orderBy(asc(approvals.createdAt));

  return results.map((r) => ({
    ...r.approval,
    task: r.task,
  }));
}
