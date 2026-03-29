"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as taskSheetService from "@/lib/services/task-sheet";
import { z } from "zod";

const createTaskSheetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export async function createTaskSheet(formData: FormData) {
  const data = createTaskSheetSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    projectId: formData.get("projectId"),
    workspaceId: formData.get("workspaceId"),
  });

  const { session } = await requireWorkspaceRole(data.workspaceId, [
    "OWNER",
    "ADMIN",
    "MEMBER",
  ]);

  const sheet = await taskSheetService.createTaskSheet(
    data.workspaceId,
    data.projectId,
    session.user.id,
    { name: data.name, description: data.description }
  );

  revalidatePath(`/projects/${data.projectId}`);
  return sheet;
}

export async function getTaskSheet(sheetId: string) {
  return taskSheetService.getTaskSheet(sheetId);
}

export async function listTaskSheets(projectId: string) {
  return taskSheetService.listTaskSheets(projectId);
}
