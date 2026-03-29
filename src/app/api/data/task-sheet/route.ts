import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSheets } from "@/lib/db/schema";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceId, projectId, name, description } = body;

  const [sheet] = await db
    .insert(taskSheets)
    .values({
      workspaceId,
      projectId,
      name,
      description: description || null,
    })
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "task_sheet_created",
    actorType: "USER",
    actorId: user.id,
    entityType: "TaskSheet",
    entityId: sheet.id,
    metadata: { name: sheet.name },
  });

  return NextResponse.json({ sheet });
}
