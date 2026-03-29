import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import { uniqueSlug } from "@/lib/crypto";
import type { Workspace } from "@prisma/client";

export async function createWorkspace(
  userId: string,
  name: string
): Promise<Workspace> {
  const slug = uniqueSlug(name);

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name, slug },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId,
        role: "OWNER",
      },
    });

    // Create default queues
    await tx.queue.createMany({
      data: [
        { workspaceId: ws.id, name: "Default", description: "Default task queue" },
        { workspaceId: ws.id, name: "Triage", description: "Incoming tasks awaiting triage" },
        { workspaceId: ws.id, name: "Urgent", description: "High-priority tasks requiring immediate attention" },
      ],
    });

    return ws;
  });

  await emitEvent({
    workspaceId: workspace.id,
    eventType: "workspace_created",
    actorType: "USER",
    actorId: userId,
    entityType: "workspace",
    entityId: workspace.id,
    metadata: { name, slug },
  });

  return workspace;
}

export async function getWorkspace(workspaceId: string) {
  return prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
}

export async function getWorkspaceBySlug(slug: string) {
  return prisma.workspace.findUniqueOrThrow({
    where: { slug },
  });
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string }
) {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
}
