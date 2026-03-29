import { prisma } from "@/lib/prisma";
import type { ActorType } from "@prisma/client";

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

  // Cursor-based pagination using composite of createdAt + id
  let cursorCondition: { createdAt?: { lt: Date }; id?: { lt: string } } | undefined;
  if (filters?.cursor) {
    const cursorLog = await prisma.runLog.findUnique({
      where: { id: filters.cursor },
      select: { createdAt: true, id: true },
    });
    if (cursorLog) {
      cursorCondition = {
        createdAt: { lt: cursorLog.createdAt },
      };
    }
  }

  const logs = await prisma.runLog.findMany({
    where: {
      workspaceId,
      ...(filters?.eventType && { eventType: filters.eventType }),
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.actorType && { actorType: filters.actorType }),
      ...cursorCondition,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1, // Fetch one extra to determine if there are more
  });

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
