import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import type { MemoryNodeType } from "@prisma/client";

export async function createMemoryNode(
  workspaceId: string,
  createdBy: string,
  data: {
    title: string;
    content: string;
    type: MemoryNodeType;
    projectId?: string;
    taskId?: string;
    agentId?: string;
  }
) {
  const node = await prisma.memoryNode.create({
    data: {
      workspaceId,
      title: data.title,
      content: data.content,
      type: data.type,
      projectId: data.projectId,
      taskId: data.taskId,
      agentId: data.agentId,
      createdBy,
      updatedBy: createdBy,
      version: 1,
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "memory_created",
    actorType: "USER",
    actorId: createdBy,
    entityType: "memory_node",
    entityId: node.id,
    metadata: { title: data.title, type: data.type },
  });

  return node;
}

export async function getMemoryNode(nodeId: string) {
  return prisma.memoryNode.findUniqueOrThrow({
    where: { id: nodeId },
  });
}

export async function listMemoryNodes(
  workspaceId: string,
  filters?: {
    type?: MemoryNodeType;
    projectId?: string;
    taskId?: string;
  }
) {
  return prisma.memoryNode.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.taskId && { taskId: filters.taskId }),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateMemoryNode(
  nodeId: string,
  updatedBy: string,
  data: { title?: string; content?: string }
) {
  const existing = await prisma.memoryNode.findUniqueOrThrow({
    where: { id: nodeId },
    select: { version: true, workspaceId: true },
  });

  const node = await prisma.memoryNode.update({
    where: { id: nodeId },
    data: {
      ...data,
      updatedBy,
      version: existing.version + 1,
    },
  });

  await emitEvent({
    workspaceId: existing.workspaceId,
    eventType: "memory_updated",
    actorType: "USER",
    actorId: updatedBy,
    entityType: "memory_node",
    entityId: node.id,
    metadata: {
      updatedFields: Object.keys(data),
      version: node.version,
    },
  });

  return node;
}

export async function searchMemory(workspaceId: string, query: string) {
  return prisma.memoryNode.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}
