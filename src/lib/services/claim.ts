import { db } from "@/lib/db";
import { claims, agents, tasks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function claimTask(
  agentId: string,
  taskId: string,
  queueId: string
) {
  // Verify the agent exists and has access to this queue
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!agent) throw new Error("Agent not found");

  if (
    agent.allowedQueueIds.length > 0 &&
    !agent.allowedQueueIds.includes(queueId)
  ) {
    throw new Error("Agent does not have access to this queue");
  }

  // Verify the task exists and is in this queue
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("Task not found");

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
  const [existingClaim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.taskId, taskId), eq(claims.status, "ACTIVE")))
    .limit(1);

  if (existingClaim) {
    throw new Error("Task already has an active claim");
  }

  const claim = await db.transaction(async (tx) => {
    const [newClaim] = await tx
      .insert(claims)
      .values({
        agentId,
        taskId,
        queueId,
        status: "ACTIVE",
      })
      .returning();

    await tx
      .update(tasks)
      .set({
        status: "IN_PROGRESS",
        ownerType: "AGENT",
        ownerId: agentId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    return newClaim;
  });

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
  const results = await db
    .select({
      claim: claims,
      agentWorkspaceId: agents.workspaceId,
    })
    .from(claims)
    .innerJoin(agents, eq(claims.agentId, agents.id))
    .where(eq(claims.id, claimId))
    .limit(1);

  const result = results[0];
  if (!result) throw new Error("Claim not found");
  const claim = result.claim;

  if (claim.agentId !== agentId) {
    throw new Error("Only the claiming agent can release a claim");
  }

  if (claim.status !== "ACTIVE") {
    throw new Error("Only active claims can be released");
  }

  const updatedClaim = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(claims)
      .set({ status: "RELEASED", releasedAt: new Date(), updatedAt: new Date() })
      .where(eq(claims.id, claimId))
      .returning();

    await tx
      .update(tasks)
      .set({
        status: "TODO",
        ownerType: "UNASSIGNED",
        ownerId: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, claim.taskId));

    return updated;
  });

  await emitEvent({
    workspaceId: result.agentWorkspaceId,
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
  const results = await db
    .select({
      claim: claims,
      agentWorkspaceId: agents.workspaceId,
    })
    .from(claims)
    .innerJoin(agents, eq(claims.agentId, agents.id))
    .where(eq(claims.id, claimId))
    .limit(1);

  const result = results[0];
  if (!result) throw new Error("Claim not found");
  const claim = result.claim;

  if (claim.agentId !== agentId) {
    throw new Error("Only the claiming agent can complete a claim");
  }

  if (claim.status !== "ACTIVE") {
    throw new Error("Only active claims can be completed");
  }

  const updatedClaim = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(claims)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(claims.id, claimId))
      .returning();

    await tx
      .update(tasks)
      .set({ status: "DONE", updatedAt: new Date() })
      .where(eq(tasks.id, claim.taskId));

    return updated;
  });

  await emitEvent({
    workspaceId: result.agentWorkspaceId,
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
  const results = await db
    .select({
      claim: claims,
      task: tasks,
    })
    .from(claims)
    .innerJoin(tasks, eq(claims.taskId, tasks.id))
    .where(and(eq(claims.agentId, agentId), eq(claims.status, "ACTIVE")))
    .orderBy(desc(claims.createdAt));

  return results.map((r) => ({
    ...r.claim,
    task: r.task,
  }));
}
