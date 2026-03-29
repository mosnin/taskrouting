"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as projectService from "@/lib/services/project";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  workspaceId: z.string().uuid(),
});

export async function createProject(formData: FormData) {
  const data = createProjectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    workspaceId: formData.get("workspaceId"),
  });
  const { session } = await requireWorkspaceRole(data.workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const project = await projectService.createProject(data.workspaceId, session.user.id, {
    name: data.name,
    description: data.description,
  });
  revalidatePath("/projects");
  return project;
}

export async function listProjects(workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return projectService.listProjects(workspaceId);
}

export async function getProject(projectId: string) {
  return projectService.getProject(projectId);
}
