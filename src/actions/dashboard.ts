"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, agents, queues, approvals, runLogs, claims } from "@/lib/db/schema";
import { eq, and, count, isNull, desc, inArray } from "drizzle-orm";

export async function getDashboardStats(workspaceId: string) {
  const user = await requireAuth();

  const [
    [taskCountResult],
    agentCountResults,
    [queueCountResult],
    [pendingApprovalsResult],
    recentLogsResult,
    tasksByStatusResult,
    tasksByPriorityResult,
    [activeClaimsResult],
  ] = await Promise.all([
    db.select({ value: count() }).from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt))),
    db.select({ status: agents.status, count: count() }).from(agents).where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt))).groupBy(agents.status),
    db.select({ value: count() }).from(queues).where(and(eq(queues.workspaceId, workspaceId), isNull(queues.deletedAt))),
    db.select({ value: count() }).from(approvals).innerJoin(tasks, eq(approvals.taskId, tasks.id)).where(and(eq(approvals.status, "PENDING"), eq(tasks.workspaceId, workspaceId))),
    db.select().from(runLogs).where(eq(runLogs.workspaceId, workspaceId)).orderBy(desc(runLogs.createdAt)).limit(15),
    db.select({ status: tasks.status, count: count() }).from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt))).groupBy(tasks.status),
    db.select({ priority: tasks.priority, count: count() }).from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt))).groupBy(tasks.priority),
    db.select({ value: count() }).from(claims).innerJoin(queues, eq(claims.queueId, queues.id)).where(and(eq(claims.status, "ACTIVE"), eq(queues.workspaceId, workspaceId))),
  ]);

  const totalAgents = agentCountResults.reduce((sum, g) => sum + g.count, 0);
  const onlineAgents = agentCountResults.find((g) => g.status === "ONLINE")?.count ?? 0;

  return {
    totalTasks: taskCountResult.value,
    totalAgents,
    onlineAgents,
    totalQueues: queueCountResult.value,
    pendingApprovals: pendingApprovalsResult.value,
    activeClaims: activeClaimsResult.value,
    recentActivity: recentLogsResult.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      entityType: log.entityType,
      entityId: log.entityId,
      actorType: log.actorType,
      actorId: log.actorId,
      message: log.eventType.replace(/_/g, " "),
      createdAt: log.createdAt.toISOString(),
    })),
    tasksByStatus: tasksByStatusResult.map((g) => ({ status: g.status, count: g.count })),
    tasksByPriority: tasksByPriorityResult.map((g) => ({ priority: g.priority, count: g.count })),
  };
}
