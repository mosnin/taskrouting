import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import type { ActorType } from "@prisma/client";

export async function requestApproval(
  taskId: string,
  requestedByType: ActorType,
  requestedById: string
) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { workspaceId: true },
  });

  const [approval] = await prisma.$transaction([
    prisma.approval.create({
      data: {
        taskId,
        requestedByType,
        requestedById,
        status: "PENDING",
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { approvalState: "PENDING" },
    }),
  ]);

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
  const existing = await prisma.approval.findUniqueOrThrow({
    where: { id: approvalId },
    include: { task: { select: { workspaceId: true } } },
  });

  if (existing.status !== "PENDING") {
    throw new Error("Approval has already been reviewed");
  }

  const approvalState = status === "APPROVED" ? "APPROVED" : "DENIED";

  const [approval] = await prisma.$transaction([
    prisma.approval.update({
      where: { id: approvalId },
      data: {
        reviewerId,
        status,
        decisionNote: note,
      },
    }),
    prisma.task.update({
      where: { id: existing.taskId },
      data: { approvalState },
    }),
  ]);

  const eventType = status === "APPROVED" ? "approval_granted" : "approval_denied";

  await emitEvent({
    workspaceId: existing.task.workspaceId,
    eventType,
    actorType: "USER",
    actorId: reviewerId,
    entityType: "approval",
    entityId: approval.id,
    metadata: { taskId: existing.taskId, status, note },
  });

  return approval;
}

export async function listPendingApprovals(workspaceId: string) {
  return prisma.approval.findMany({
    where: {
      status: "PENDING",
      task: { workspaceId },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          projectId: true,
          ownerType: true,
          ownerId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
