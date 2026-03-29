import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import type {
  TaskStatus,
  TaskPriority,
  OwnerType,
  ActorType,
} from "@prisma/client";

export async function createTask(
  workspaceId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    projectId: string;
    taskSheetId?: string;
    queueId?: string;
    priority?: TaskPriority;
    requiredCapabilities?: string[];
    dueAt?: Date;
  }
) {
  let resolvedQueueId = data.queueId;

  // Auto-route to a matching queue if no queue specified but capabilities provided
  if (!resolvedQueueId && data.requiredCapabilities?.length) {
    const queues = await prisma.queue.findMany({
      where: { workspaceId, deletedAt: null },
    });

    for (const queue of queues) {
      if (queue.requiredCapabilities.length === 0) continue;
      const taskCaps = new Set(data.requiredCapabilities);
      const matches = queue.requiredCapabilities.every((cap) => taskCaps.has(cap));
      if (matches) {
        resolvedQueueId = queue.id;
        break;
      }
    }
  }

  const task = await prisma.task.create({
    data: {
      workspaceId,
      projectId: data.projectId,
      taskSheetId: data.taskSheetId,
      queueId: resolvedQueueId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      requiredCapabilities: data.requiredCapabilities ?? [],
      dueAt: data.dueAt,
      status: "BACKLOG",
      ownerType: "UNASSIGNED",
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "task_created",
    actorType: "USER",
    actorId: userId,
    entityType: "task",
    entityId: task.id,
    metadata: {
      title: data.title,
      projectId: data.projectId,
      queueId: resolvedQueueId ?? null,
      autoRouted: !data.queueId && !!resolvedQueueId,
    },
  });

  return task;
}

export async function getTask(taskId: string) {
  return prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      subtasks: { orderBy: { order: "asc" } },
      claims: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listTasks(
  workspaceId: string,
  filters?: {
    projectId?: string;
    taskSheetId?: string;
    queueId?: string;
    status?: TaskStatus;
    ownerType?: OwnerType;
  }
) {
  return prisma.task.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.taskSheetId && { taskSheetId: filters.taskSheetId }),
      ...(filters?.queueId && { queueId: filters.queueId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.ownerType && { ownerType: filters.ownerType }),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    queueId: string;
    ownerType: OwnerType;
    ownerId: string;
  }>
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data,
  });

  await emitEvent({
    workspaceId: task.workspaceId,
    eventType: "task_updated",
    actorType: "USER",
    actorId: userId,
    entityType: "task",
    entityId: task.id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return task;
}

export async function routeTask(
  taskId: string,
  queueId: string,
  userId: string
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { queueId },
  });

  await emitEvent({
    workspaceId: task.workspaceId,
    eventType: "task_routed",
    actorType: "USER",
    actorId: userId,
    entityType: "task",
    entityId: task.id,
    metadata: { queueId },
  });

  return task;
}

export async function addComment(
  taskId: string,
  actorType: ActorType,
  actorId: string,
  content: string
) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { workspaceId: true },
  });

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      actorType,
      actorId,
      content,
    },
  });

  await emitEvent({
    workspaceId: task.workspaceId,
    eventType: "comment_added",
    actorType,
    actorId,
    entityType: "task_comment",
    entityId: comment.id,
    metadata: { taskId },
  });

  return comment;
}
