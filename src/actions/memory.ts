"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as memoryService from "@/lib/services/memory";
import { z } from "zod";

const createMemoryNodeSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().max(100000),
  type: z.enum([
    "DOCUMENT",
    "CHECKLIST",
    "DECISION",
    "SPEC",
    "RUNBOOK",
    "RESEARCH",
    "MEETING_NOTES",
    "REFERENCE",
  ]),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
});

export async function createMemoryNode(data: z.infer<typeof createMemoryNodeSchema>) {
  const parsed = createMemoryNodeSchema.parse(data);
  const { session } = await requireWorkspaceRole(parsed.workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const node = await memoryService.createMemoryNode(parsed.workspaceId, session.user.id, {
    title: parsed.title,
    content: parsed.content,
    type: parsed.type as any,
    projectId: parsed.projectId,
    taskId: parsed.taskId,
    agentId: parsed.agentId,
  });
  revalidatePath("/memory");
  return node;
}

const updateMemoryNodeSchema = z.object({
  nodeId: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  content: z.string().max(100000).optional(),
  workspaceId: z.string().uuid(),
});

export async function updateMemoryNode(data: z.infer<typeof updateMemoryNodeSchema>) {
  const parsed = updateMemoryNodeSchema.parse(data);
  const { session } = await requireWorkspaceRole(parsed.workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const node = await memoryService.updateMemoryNode(parsed.nodeId, session.user.id, {
    title: parsed.title,
    content: parsed.content,
  });
  revalidatePath("/memory");
  return node;
}

export async function listMemoryNodes(
  workspaceId: string,
  filters?: { type?: string; projectId?: string; taskId?: string }
) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return memoryService.listMemoryNodes(workspaceId, filters as any);
}

export async function searchMemory(workspaceId: string, query: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return memoryService.searchMemory(workspaceId, query);
}
