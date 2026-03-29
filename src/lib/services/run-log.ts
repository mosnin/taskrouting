import { db } from "@/lib/db";
import { runLogs } from "@/lib/db/schema";
import type { ActorType } from "@/lib/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";

export async function listRunLogs(
  workspaceId: string,
  filters?: {
    eventType?: string;
    entityType?: string;
    entityId?: string;
    actorType?: ActorType;
    limit?: number;
    cursor?: string;
  }
) {
  const take = Math.min(filters?.limit ?? 50, 200);

  // Cursor-based pagination using createdAt
  let cursorDate: Date | undefined;
  if (filters?.cursor) {
    const [cursorLog] = await db
      .select({ createdAt: runLogs.createdAt })
      .from(runLogs)
      .where(eq(runLogs.id, filters.cursor))
      .limit(1);
    if (cursorLog) {
      cursorDate = cursorLog.createdAt;
    }
  }

  const conditions = [eq(runLogs.workspaceId, workspaceId)];

  if (filters?.eventType) conditions.push(eq(runLogs.eventType, filters.eventType));
  if (filters?.entityType) conditions.push(eq(runLogs.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(runLogs.entityId, filters.entityId));
  if (filters?.actorType) conditions.push(eq(runLogs.actorType, filters.actorType));
  if (cursorDate) conditions.push(lt(runLogs.createdAt, cursorDate));

  const logs = await db
    .select()
    .from(runLogs)
    .where(and(...conditions))
    .orderBy(desc(runLogs.createdAt), desc(runLogs.id))
    .limit(take + 1); // Fetch one extra to determine if there are more

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
