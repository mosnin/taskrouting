"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardStats(workspaceId: string) {
  const session = await requireSession();

  const [
    taskCounts,
    agentCounts,
    queueCount,
    pendingApprovals,
    recentLogs,
    tasksByStatus,
    tasksByPriority,
    activeClaimsCount,
  ] = await Promise.all([
    prisma.task.count({ where: { workspaceId, deletedAt: null } }),
    prisma.agent.groupBy({ by: ["status"], where: { workspaceId, deletedAt: null }, _count: true }),
    prisma.queue.count({ where: { workspaceId, deletedAt: null } }),
    prisma.approval.count({ where: { status: "PENDING", task: { workspaceId } } }),
    prisma.runLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.task.groupBy({ by: ["status"], where: { workspaceId, deletedAt: null }, _count: true }),
    prisma.task.groupBy({ by: ["priority"], where: { workspaceId, deletedAt: null }, _count: true }),
    prisma.claim.count({ where: { status: "ACTIVE", queue: { workspaceId } } }),
  ]);

  const totalAgents = agentCounts.reduce((sum, g) => sum + g._count, 0);
  const onlineAgents = agentCounts.find((g) => g.status === "ONLINE")?._count ?? 0;

  return {
    totalTasks: taskCounts,
    totalAgents,
    onlineAgents,
    totalQueues: queueCount,
    pendingApprovals,
    activeClaims: activeClaimsCount,
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      entityType: log.entityType,
      entityId: log.entityId,
      actorType: log.actorType,
      actorId: log.actorId,
      message: log.eventType.replace(/_/g, " "),
      createdAt: log.createdAt.toISOString(),
    })),
    tasksByStatus: tasksByStatus.map((g) => ({ status: g.status, count: g._count })),
    tasksByPriority: tasksByPriority.map((g) => ({ priority: g.priority, count: g._count })),
  };
}
