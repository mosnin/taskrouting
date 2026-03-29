import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import type { ProjectStatus } from "@prisma/client";

export async function createProject(
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "project_created",
    actorType: "USER",
    actorId: userId,
    entityType: "project",
    entityId: project.id,
    metadata: { name: data.name },
  });

  return project;
}

export async function getProject(projectId: string) {
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { taskSheets: { where: { deletedAt: null }, orderBy: { order: "asc" } } },
  });
}

export async function listProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId, status: "ACTIVE", deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { name?: string; description?: string; status?: ProjectStatus }
) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  await emitEvent({
    workspaceId: project.workspaceId,
    eventType: "project_updated",
    actorType: "USER",
    actorId: userId,
    entityType: "project",
    entityId: project.id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return project;
}
