import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceId, projectId, taskSheetId, title, description, priority, queueId } = body;

  const [task] = await db
    .insert(tasks)
    .values({
      workspaceId,
      projectId,
      taskSheetId: taskSheetId || null,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      queueId: queueId || null,
      status: "TODO",
    })
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "task_created",
    actorType: "USER",
    actorId: user.id,
    entityType: "Task",
    entityId: task.id,
    metadata: { title: task.title },
  });

  return NextResponse.json({ task });
}
