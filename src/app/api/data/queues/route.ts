import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { queues, tasks, workspaceMembers } from "@/lib/db/schema";
import { eq, and, isNull, asc, count, inArray, sql } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ queues: [] });

  const workspaceId = memberships[0].workspaceId;
  const queueRows = await db
    .select()
    .from(queues)
    .where(and(eq(queues.workspaceId, workspaceId), isNull(queues.deletedAt)))
    .orderBy(asc(queues.name));

  // Count active tasks per queue
  const queueIds = queueRows.map((q) => q.id);
  const taskCounts = queueIds.length
    ? await db
        .select({ queueId: tasks.queueId, count: count() })
        .from(tasks)
        .where(
          and(
            sql`${tasks.queueId} = ANY(${queueIds})`,
            isNull(tasks.deletedAt),
            inArray(tasks.status, ["TODO", "BACKLOG", "IN_PROGRESS", "IN_REVIEW"])
          )
        )
        .groupBy(tasks.queueId)
    : [];

  const taskCountMap = Object.fromEntries(taskCounts.map((t) => [t.queueId!, t.count]));

  const queuesWithCounts = queueRows.map((q) => ({
    ...q,
    _count: { tasks: taskCountMap[q.id] ?? 0 },
  }));

  return NextResponse.json({ queues: queuesWithCounts });
}
