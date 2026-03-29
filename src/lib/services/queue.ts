import { db } from "@/lib/db";
import { queues, tasks } from "@/lib/db/schema";
import type { TaskStatus } from "@/lib/db/schema";
import { eq, and, isNull, asc, desc, count, sql, inArray } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function createQueue(
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string; requiredCapabilities?: string[] }
) {
  const [queue] = await db
    .insert(queues)
    .values({
      workspaceId,
      name: data.name,
      description: data.description,
      requiredCapabilities: data.requiredCapabilities ?? [],
    })
    .returning();

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
  const [queue] = await db
    .select()
    .from(queues)
    .where(eq(queues.id, queueId))
    .limit(1);
  if (!queue) throw new Error("Queue not found");

  const [taskCountResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.queueId, queueId), isNull(tasks.deletedAt)));

  return {
    ...queue,
    taskCount: taskCountResult.value,
  };
}

export async function listQueues(workspaceId: string) {
  const allQueues = await db
    .select({
      queue: queues,
      taskCount: sql<number>`(SELECT count(*) FROM tasks WHERE tasks.queue_id = ${queues.id} AND tasks.deleted_at IS NULL)`.as("task_count"),
    })
    .from(queues)
    .where(and(eq(queues.workspaceId, workspaceId), isNull(queues.deletedAt)))
    .orderBy(asc(queues.createdAt));

  return allQueues.map((q) => ({
    ...q.queue,
    taskCount: Number(q.taskCount),
  }));
}

export async function getQueueTasks(queueId: string, status?: TaskStatus[]) {
  const conditions = [eq(tasks.queueId, queueId), isNull(tasks.deletedAt)];

  if (status?.length) {
    conditions.push(inArray(tasks.status, status));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.priority), asc(tasks.createdAt));
}
