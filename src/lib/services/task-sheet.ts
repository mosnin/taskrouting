import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function createTaskSheet(
  workspaceId: string,
  projectId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  // Determine the next order value
  const lastSheet = await prisma.taskSheet.findFirst({
    where: { projectId, deletedAt: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const taskSheet = await prisma.taskSheet.create({
    data: {
      workspaceId,
      projectId,
      name: data.name,
      description: data.description,
      order: (lastSheet?.order ?? -1) + 1,
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "task_sheet_created",
    actorType: "USER",
    actorId: userId,
    entityType: "task_sheet",
    entityId: taskSheet.id,
    metadata: { name: data.name, projectId },
  });

  return taskSheet;
}

export async function getTaskSheet(sheetId: string) {
  return prisma.taskSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: {
      tasks: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function listTaskSheets(projectId: string) {
  return prisma.taskSheet.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { order: "asc" },
  });
}
