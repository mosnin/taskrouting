import { db } from "@/lib/db";
import { taskSheets, tasks } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function createTaskSheet(
  workspaceId: string,
  projectId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  // Determine the next order value
  const [lastSheet] = await db
    .select({ order: taskSheets.order })
    .from(taskSheets)
    .where(and(eq(taskSheets.projectId, projectId), isNull(taskSheets.deletedAt)))
    .orderBy(desc(taskSheets.order))
    .limit(1);

  const [taskSheet] = await db
    .insert(taskSheets)
    .values({
      workspaceId,
      projectId,
      name: data.name,
      description: data.description,
      order: (lastSheet?.order ?? -1) + 1,
    })
    .returning();

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
  const [sheet] = await db
    .select()
    .from(taskSheets)
    .where(eq(taskSheets.id, sheetId))
    .limit(1);
  if (!sheet) throw new Error("Task sheet not found");

  const sheetTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.taskSheetId, sheetId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.order));

  return { ...sheet, tasks: sheetTasks };
}

export async function listTaskSheets(projectId: string) {
  return db
    .select()
    .from(taskSheets)
    .where(and(eq(taskSheets.projectId, projectId), isNull(taskSheets.deletedAt)))
    .orderBy(asc(taskSheets.order));
}
