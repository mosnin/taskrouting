"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as queueService from "@/lib/services/queue";
import { z } from "zod";

const createQueueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  workspaceId: z.string().uuid(),
});

export async function createQueue(formData: FormData) {
  const capsRaw = formData.get("requiredCapabilities");
  const data = createQueueSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    requiredCapabilities: capsRaw ? JSON.parse(capsRaw as string) : undefined,
    workspaceId: formData.get("workspaceId"),
  });
  const { user } = await requireWorkspaceRole(data.workspaceId, ["OWNER", "ADMIN"]);
  const queue = await queueService.createQueue(data.workspaceId, user.id, {
    name: data.name,
    description: data.description,
    requiredCapabilities: data.requiredCapabilities,
  });
  revalidatePath("/queues");
  return queue;
}

export async function listQueues(workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return queueService.listQueues(workspaceId);
}

export async function getQueueTasks(queueId: string, workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return queueService.getQueueTasks(queueId);
}
