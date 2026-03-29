import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import type { TaskStatus } from "@prisma/client";

export async function createQueue(
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string; requiredCapabilities?: string[] }
) {
  const queue = await prisma.queue.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      requiredCapabilities: data.requiredCapabilities ?? [],
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "queue_created",
    actorType: "USER",
    actorId: userId,
    entityType: "queue",
    entityId: queue.id,
    metadata: { name: data.name },
  });

  return queue;
}

export async function getQueue(queueId: string) {
  const queue = await prisma.queue.findUniqueOrThrow({
    where: { id: queueId },
    include: {
      _count: {
        select: {
          tasks: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  return {
    ...queue,
    taskCount: queue._count.tasks,
  };
}

export async function listQueues(workspaceId: string) {
  const queues = await prisma.queue.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      _count: {
        select: {
          tasks: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return queues.map((q: typeof queues[number]) => ({
    ...q,
    taskCount: q._count.tasks,
  }));
}

export async function getQueueTasks(queueId: string, status?: TaskStatus[]) {
  return prisma.task.findMany({
    where: {
      queueId,
      deletedAt: null,
      ...(status?.length && { status: { in: status } }),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}
