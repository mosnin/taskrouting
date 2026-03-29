import { db } from "@/lib/db";
import { memoryNodes } from "@/lib/db/schema";
import type { MemoryNodeType } from "@/lib/db/schema";
import { eq, and, isNull, or, ilike, desc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

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
  const [node] = await db
    .insert(memoryNodes)
    .values({
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
    })
    .returning();

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
  const [node] = await db
    .select()
    .from(memoryNodes)
    .where(eq(memoryNodes.id, nodeId))
    .limit(1);
  if (!node) throw new Error("Memory node not found");
  return node;
}

export async function listMemoryNodes(
  workspaceId: string,
  filters?: {
    type?: MemoryNodeType;
    projectId?: string;
    taskId?: string;
  }
) {
  const conditions = [
    eq(memoryNodes.workspaceId, workspaceId),
    isNull(memoryNodes.deletedAt),
  ];

  if (filters?.type) conditions.push(eq(memoryNodes.type, filters.type));
  if (filters?.projectId) conditions.push(eq(memoryNodes.projectId, filters.projectId));
  if (filters?.taskId) conditions.push(eq(memoryNodes.taskId, filters.taskId));

  return db
    .select()
    .from(memoryNodes)
    .where(and(...conditions))
    .orderBy(desc(memoryNodes.updatedAt));
}

export async function updateMemoryNode(
  nodeId: string,
  updatedBy: string,
  data: { title?: string; content?: string }
) {
  const [existing] = await db
    .select({ version: memoryNodes.version, workspaceId: memoryNodes.workspaceId })
    .from(memoryNodes)
    .where(eq(memoryNodes.id, nodeId))
    .limit(1);
  if (!existing) throw new Error("Memory node not found");

  const [node] = await db
    .update(memoryNodes)
    .set({
      ...data,
      updatedBy,
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(memoryNodes.id, nodeId))
    .returning();

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
  return db
    .select()
    .from(memoryNodes)
    .where(
      and(
        eq(memoryNodes.workspaceId, workspaceId),
        isNull(memoryNodes.deletedAt),
        or(
          ilike(memoryNodes.title, `%${query}%`),
          ilike(memoryNodes.content, `%${query}%`)
        )
      )
    )
    .orderBy(desc(memoryNodes.updatedAt));
}
