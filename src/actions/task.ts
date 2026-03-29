"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as taskService from "@/lib/services/task";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  projectId: z.string().uuid(),
  taskSheetId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  workspaceId: z.string().uuid(),
});

export async function createTask(formData: FormData) {
  const capsRaw = formData.get("requiredCapabilities");
  const data = createTaskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    projectId: formData.get("projectId"),
    taskSheetId: formData.get("taskSheetId") || undefined,
    queueId: formData.get("queueId") || undefined,
    priority: formData.get("priority") || undefined,
    requiredCapabilities: capsRaw ? JSON.parse(capsRaw as string) : undefined,
    workspaceId: formData.get("workspaceId"),
  });
  const { session } = await requireWorkspaceRole(data.workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const task = await taskService.createTask(data.workspaceId, session.user.id, {
    title: data.title,
    description: data.description,
    projectId: data.projectId,
    taskSheetId: data.taskSheetId,
    queueId: data.queueId,
    priority: data.priority as any,
    requiredCapabilities: data.requiredCapabilities,
  });
  revalidatePath("/projects");
  revalidatePath("/queues");
  return task;
}

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  queueId: z.string().uuid().nullable().optional(),
});

export async function updateTask(data: z.infer<typeof updateTaskSchema>) {
  const parsed = updateTaskSchema.parse(data);
  const { session } = await requireWorkspaceRole(parsed.workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const { taskId, workspaceId, ...updates } = parsed;
  const task = await taskService.updateTask(taskId, session.user.id, updates as any);
  revalidatePath("/projects");
  revalidatePath("/queues");
  return task;
}

export async function routeTask(taskId: string, queueId: string, workspaceId: string) {
  const { session } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  return taskService.routeTask(taskId, queueId, session.user.id);
}

export async function addComment(
  taskId: string,
  content: string,
  workspaceId: string
) {
  const { session } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  return taskService.addComment(taskId, "USER", session.user.id, content);
}

export async function listTasks(workspaceId: string, filters?: {
  projectId?: string;
  taskSheetId?: string;
  queueId?: string;
  status?: string;
}) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return taskService.listTasks(workspaceId, filters as any);
}
