import { db } from "@/lib/db";
import {
  tasks,
  subtasks,
  claims,
  artifacts,
  taskComments,
  queues,
} from "@/lib/db/schema";
import type {
  TaskStatus,
  TaskPriority,
  OwnerType,
  ActorType,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, inArray } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

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
    const allQueues = await db
      .select()
      .from(queues)
      .where(and(eq(queues.workspaceId, workspaceId), isNull(queues.deletedAt)));

    for (const queue of allQueues) {
      if (queue.requiredCapabilities.length === 0) continue;
      const taskCaps = new Set(data.requiredCapabilities);
      const matches = queue.requiredCapabilities.every((cap) => taskCaps.has(cap));
      if (matches) {
        resolvedQueueId = queue.id;
        break;
      }
    }
  }

  const [task] = await db
    .insert(tasks)
    .values({
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
    })
    .returning();

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
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("Task not found");

  const [taskSubtasks, taskClaims, taskArtifacts, taskCommentsResult] =
    await Promise.all([
      db
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, taskId))
        .orderBy(asc(subtasks.order)),
      db
        .select()
        .from(claims)
        .where(eq(claims.taskId, taskId))
        .orderBy(desc(claims.createdAt)),
      db
        .select()
        .from(artifacts)
        .where(eq(artifacts.taskId, taskId))
        .orderBy(desc(artifacts.createdAt)),
      db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, taskId))
        .orderBy(asc(taskComments.createdAt)),
    ]);

  return {
    ...task,
    subtasks: taskSubtasks,
    claims: taskClaims,
    artifacts: taskArtifacts,
    comments: taskCommentsResult,
  };
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
  const conditions = [eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)];

  if (filters?.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters?.taskSheetId) conditions.push(eq(tasks.taskSheetId, filters.taskSheetId));
  if (filters?.queueId) conditions.push(eq(tasks.queueId, filters.queueId));
  if (filters?.status) conditions.push(eq(tasks.status, filters.status));
  if (filters?.ownerType) conditions.push(eq(tasks.ownerType, filters.ownerType));

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.priority), desc(tasks.createdAt));
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
  const [task] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!task) throw new Error("Task not found");

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
  const [task] = await db
    .update(tasks)
    .set({ queueId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!task) throw new Error("Task not found");

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
  const [task] = await db
    .select({ workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("Task not found");

  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId,
      actorType,
      actorId,
      content,
    })
    .returning();

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
