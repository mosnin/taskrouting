import { prisma } from "@/lib/prisma";
import type { AgentStatus } from "@prisma/client";

export async function createAgent(
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    capabilities: string[];
    allowedQueueIds?: string[];
  }
) {
  return prisma.agent.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      capabilities: data.capabilities,
      allowedQueueIds: data.allowedQueueIds ?? [],
    },
  });
}

export async function getAgent(agentId: string) {
  return prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    include: {
      tokens: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      },
      claims: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function listAgents(workspaceId: string) {
  return prisma.agent.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAgentStatus(agentId: string, status: AgentStatus) {
  return prisma.agent.update({
    where: { id: agentId },
    data: {
      status,
      lastSeenAt: new Date(),
    },
  });
}

export async function deleteAgent(agentId: string) {
  return prisma.agent.update({
    where: { id: agentId },
    data: { deletedAt: new Date() },
  });
}
