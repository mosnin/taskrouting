import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function claimTask(
  agentId: string,
  taskId: string,
  queueId: string
) {
  // Verify the agent exists and has access to this queue
  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
  });

  if (
    agent.allowedQueueIds.length > 0 &&
    !agent.allowedQueueIds.includes(queueId)
  ) {
    throw new Error("Agent does not have access to this queue");
  }

  // Verify the task exists and is in this queue
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
  });

  if (task.queueId !== queueId) {
    throw new Error("Task is not in the specified queue");
  }

  // Check that the agent has the required capabilities
  if (task.requiredCapabilities.length > 0) {
    const agentCaps = new Set(agent.capabilities);
    const missing = task.requiredCapabilities.filter(
      (cap: string) => !agentCaps.has(cap)
    );
    if (missing.length > 0) {
      throw new Error(
        `Agent is missing required capabilities: ${missing.join(", ")}`
      );
    }
  }

  // Check no active claim exists on this task
  const existingClaim = await prisma.claim.findFirst({
    where: { taskId, status: "ACTIVE" },
  });

  if (existingClaim) {
    throw new Error("Task already has an active claim");
  }

  const [claim] = await prisma.$transaction([
    prisma.claim.create({
      data: {
        agentId,
        taskId,
        queueId,
        status: "ACTIVE",
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        ownerType: "AGENT",
        ownerId: agentId,
      },
    }),
  ]);

  await emitEvent({
    workspaceId: agent.workspaceId,
    eventType: "task_claimed",
    actorType: "AGENT",
    actorId: agentId,
    entityType: "claim",
    entityId: claim.id,
    metadata: { taskId, queueId },
  });

  return claim;
}

export async function releaseClaim(claimId: string, agentId: string) {
  const claim = await prisma.claim.findUniqueOrThrow({
    where: { id: claimId },
    include: { agent: { select: { workspaceId: true } } },
  });

  if (claim.agentId !== agentId) {
    throw new Error("Only the claiming agent can release a claim");
  }

  if (claim.status !== "ACTIVE") {
    throw new Error("Only active claims can be released");
  }

  const [updatedClaim] = await prisma.$transaction([
    prisma.claim.update({
      where: { id: claimId },
      data: { status: "RELEASED", releasedAt: new Date() },
    }),
    prisma.task.update({
      where: { id: claim.taskId },
      data: {
        status: "TODO",
        ownerType: "UNASSIGNED",
        ownerId: null,
      },
    }),
  ]);

  await emitEvent({
    workspaceId: claim.agent.workspaceId,
    eventType: "task_released",
    actorType: "AGENT",
    actorId: agentId,
    entityType: "claim",
    entityId: claim.id,
    metadata: { taskId: claim.taskId, queueId: claim.queueId },
  });

  return updatedClaim;
}

export async function completeClaim(claimId: string, agentId: string) {
  const claim = await prisma.claim.findUniqueOrThrow({
    where: { id: claimId },
    include: { agent: { select: { workspaceId: true } } },
  });

  if (claim.agentId !== agentId) {
    throw new Error("Only the claiming agent can complete a claim");
  }

  if (claim.status !== "ACTIVE") {
    throw new Error("Only active claims can be completed");
  }

  const [updatedClaim] = await prisma.$transaction([
    prisma.claim.update({
      where: { id: claimId },
      data: { status: "COMPLETED" },
    }),
    prisma.task.update({
      where: { id: claim.taskId },
      data: { status: "DONE" },
    }),
  ]);

  await emitEvent({
    workspaceId: claim.agent.workspaceId,
    eventType: "task_completed",
    actorType: "AGENT",
    actorId: agentId,
    entityType: "claim",
    entityId: claim.id,
    metadata: { taskId: claim.taskId, queueId: claim.queueId },
  });

  return updatedClaim;
}

export async function getActiveClaims(agentId: string) {
  return prisma.claim.findMany({
    where: { agentId, status: "ACTIVE" },
    include: {
      task: true,
      queue: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
