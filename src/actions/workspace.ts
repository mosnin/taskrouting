"use server";

import { requireSession } from "@/lib/auth";
import * as workspaceService from "@/lib/services/workspace";
import { redirect } from "next/navigation";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function createWorkspace(formData: FormData) {
  const session = await requireSession();
  const parsed = createWorkspaceSchema.parse({
    name: formData.get("name"),
  });
  const workspace = await workspaceService.createWorkspace(session.user.id, parsed.name);
  redirect(`/`);
  return workspace;
}

export async function getUserWorkspaces() {
  const session = await requireSession();
  return workspaceService.getUserWorkspaces(session.user.id);
}
