import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, queues, subtasks, claims } from "@/lib/db/schema";
import { eq, and, isNull, asc, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const queueId = request.nextUrl.searchParams.get("queueId");
  if (!queueId) return NextResponse.json({ error: "Missing queueId" }, { status: 400 });

  const taskRows = await db
    .select({
      id: tasks.id,
      workspaceId: tasks.workspaceId,
      projectId: tasks.projectId,
      taskSheetId: tasks.taskSheetId,
      queueId: tasks.queueId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      ownerType: tasks.ownerType,
      ownerId: tasks.ownerId,
      requiredCapabilities: tasks.requiredCapabilities,
      approvalState: tasks.approvalState,
      confidence: tasks.confidence,
      dueAt: tasks.dueAt,
      metadata: tasks.metadata,
      order: tasks.order,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      deletedAt: tasks.deletedAt,
      queueName: queues.name,
    })
    .from(tasks)
    .leftJoin(queues, eq(tasks.queueId, queues.id))
    .where(and(eq(tasks.queueId, queueId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.priority), asc(tasks.createdAt))
    .limit(50);

  // Get counts for subtasks and claims per task
  const taskIds = taskRows.map((t) => t.id);
  const subtaskCounts = taskIds.length
    ? await db
        .select({ taskId: subtasks.taskId, count: count() })
        .from(subtasks)
        .where(sql`${subtasks.taskId} = ANY(${taskIds})`)
        .groupBy(subtasks.taskId)
    : [];
  const claimCounts = taskIds.length
    ? await db
        .select({ taskId: claims.taskId, count: count() })
        .from(claims)
        .where(sql`${claims.taskId} = ANY(${taskIds})`)
        .groupBy(claims.taskId)
    : [];

  const subtaskMap = Object.fromEntries(subtaskCounts.map((s) => [s.taskId, s.count]));
  const claimMap = Object.fromEntries(claimCounts.map((c) => [c.taskId, c.count]));

  const tasksWithCounts = taskRows.map((t) => ({
    ...t,
    queue: t.queueId ? { id: t.queueId, name: t.queueName } : null,
    _count: {
      subtasks: subtaskMap[t.id] ?? 0,
      claims: claimMap[t.id] ?? 0,
    },
  }));

  return NextResponse.json({ tasks: tasksWithCounts });
}
